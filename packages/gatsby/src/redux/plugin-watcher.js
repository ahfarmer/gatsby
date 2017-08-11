// Invoke plugins for certain actions.

const { store, emitter } = require(`./index`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const { graphql } = require(`graphql`)
const queryRunner = require(`../internal-plugins/query-runner/query-runner`)
const { actions } = require(`./actions`)


// const {
//   extractQueries,
// } = require(`../internal-plugins/query-runner/query-watcher`)
// const {
//   runQueries,
// } = require(`../internal-plugins/query-runner/page-query-runner`)
// const { writePages } = require(`../internal-plugins/query-runner/pages-writer`)

function getPagesAndLayouts(store) {
  const state = store.getState()
  return [...state.pages, ...state.layouts]
}

async function updatePages() {
  // TODO: compare pages before & after running create pages
  // BUT - don't I have to differentiate between pages that were
  // created statefully vs non-statefully?
  // I only want to delete pages that were created non-statefully.

  const graphqlRunner = (query, context = {}) => {
    const schema = store.getState().schema
    return graphql(schema, query, context, context, context)
  }

  console.log(`API runner createPages`)
  const beforePagesAndLayouts = getPagesAndLayouts(store)
  console.log(`Before pages: ${beforePagesAndLayouts.length} ${beforePagesAndLayouts.map(p => p.path)}`)
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

  const touchedPages = getPagesAndLayouts(store)
  console.log(`Before pages touched: ${touchedPages.length} ${touchedPages.map(p => p.path)}`)

  // this creates nodes, which will mark us as dirty again
  await apiRunnerNode(`createPages`, {
    graphql: graphqlRunner,
    traceId: `watch-createPages`,
    waitForCascadingActions: true,
  })

  // now I need to re-run the queries for the pages that were created
  const state = store.getState()
  const afterPagesAndLayouts = getPagesAndLayouts(store)
  console.log(`After pages: ${afterPagesAndLayouts.length} ${afterPagesAndLayouts.map(p => p.path)}`)
  const stillTouched = afterPagesAndLayouts.filter(pl => pl.touch)
  console.log(`After pages touched: ${stillTouched.length} ${stillTouched.map(p => p.path)}`)

  return Promise.all(
    afterPagesAndLayouts.map((pl) => {
      queryRunner(pl, state.components[pl.component])
    })
  )
}

let dirty = false

// The goal is to update pages whenever graphql data changes.
// CREATE_NODE indicates that graphql data has changed.
// Instead of immediately updating pages, we mark as dirty and wait for API_RUNNING_QUEUE_EMPTY.
emitter.on(`CREATE_NODE`, action => {
  console.log(`plugin-watcher CREATE_NODE`, action.traceId)
  // Check that the data change was not caused by a page created in this watcher.
  if (action.traceId !== `watch-createPages`) {
    dirty = true
  }
})

// Whenever the queue is empty, update the pages if graphql data has changed (dirty === true).
emitter.on(`API_RUNNING_QUEUE_EMPTY`, action => {
  console.log(`plugin-watcher API_RUNNING_QUEUE_EMPTY dirty:${dirty}`)
  if (!dirty) {
    return
  }
  dirty = false
  updatePages()
})
