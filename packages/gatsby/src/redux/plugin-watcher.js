const { store, emitter } = require(`./index`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const { graphql } = require(`graphql`)
const queryRunner = require(`../internal-plugins/query-runner/query-runner`)

function getPagesAndLayouts(store) {
  const state = store.getState()
  return [...state.pages, ...state.layouts]
}

async function updatePages() {
  const graphqlRunner = (query, context = {}) => {
    const schema = store.getState().schema
    return graphql(schema, query, context, context, context)
  }

  /**
   * Mark all the pages that currently exist so that after running createPages
   * in all of the plugins, we can tell which ones were recreated and do not
   * need to be deleted.
   */
   store.dispatch({
     type: `TOUCH_PAGES`,
     plugin: ``,
     traceId: ``,
   })

  const beforePages = getPagesAndLayouts(store)
  console.log(`Before pages: ${beforePages.length} ${beforePages.map(p => p.path)}`)

  // this creates nodes, which will mark us as dirty again
  await apiRunnerNode(`createPages`, {
    graphql: graphqlRunner,
    traceId: `watch-createPages`,
    waitForCascadingActions: true,
  })

  // TODO: delete pages that were not recreated
  // Before doing that I need to know which pages were not created statefully - stateful pages should not be deleted here
  const state = store.getState()
  const afterPages = getPagesAndLayouts(store)
  console.log(`After pages: ${afterPages.length} ${afterPages.map(p => p.path)}`)
  // TODO: delete pages that are not stateful and that are still touched
  const stillTouched = afterPages.filter(pl => pl.touch)
  console.log(`After pages touched: ${stillTouched.length} ${stillTouched.map(p => p.path)}`)

  // Re-run the queries for the pages that were created
  const queryPages = getPagesAndLayouts(store)
  // TODO: do not run queries for stateful pages, they were not recreated
  return Promise.all(
    queryPages.map((pl) => {
      queryRunner(pl, state.components[pl.component])
    })
  )
}

let dirty = false

// The goal is to update pages whenever graphql data changes.
// CREATE_NODE indicates that graphql data has changed.
// Instead of immediately updating pages, we mark as dirty and wait for API_RUNNING_QUEUE_EMPTY.
emitter.on(`CREATE_NODE`, action => {
  console.log(`CREATE_NODE`, action.traceId)
  // Check that the data change was not caused by a page created in this watcher.
  if (action.traceId !== `watch-createPages`) {
    dirty = true
  }
})

// Whenever the queue is empty, update the pages if graphql data has changed (dirty === true).
emitter.on(`API_RUNNING_QUEUE_EMPTY`, action => {
  console.log(`API_RUNNING_QUEUE_EMPTY dirty:${dirty}`)
  if (!dirty) {
    return
  }
  dirty = false
  updatePages()
})
