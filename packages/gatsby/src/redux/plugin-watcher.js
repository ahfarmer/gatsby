// Invoke plugins for certain actions.

const { store, emitter } = require(`./index`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const { graphql } = require(`graphql`)

// const {
//   extractQueries,
// } = require(`../internal-plugins/query-runner/query-watcher`)
// const {
//   runQueries,
// } = require(`../internal-plugins/query-runner/page-query-runner`)
const { writePages } = require(`../internal-plugins/query-runner/pages-writer`)


async function updatePages() {
  // TODO: compare pages before & after running create pages

  const graphqlRunner = (query, context = {}) => {
    const schema = store.getState().schema
    return graphql(schema, query, context, context, context)
  }

  console.log(`before pages`, store.getState().pages)

  await apiRunnerNode(`createPages`, {
    graphql: graphqlRunner,
    traceId: `watch-createPages`,
    waitForCascadingActions: true,
  })

  console.log(`after pages`, store.getState().pages)

  await writePages()
}

let dirty = false

emitter.on(`CREATE_NODE`, action => {
  console.log(`plugin-watcher CREATE_NODE`, action.traceId)
  dirty = true
})

emitter.on(`API_RUNNING_QUEUE_EMPTY`, action => {
  console.log(`plugin-watcher API_RUNNING_QUEUE_EMPTY`)
  if (!dirty) {
    return
  }
  dirty = false

  updatePages()
})
