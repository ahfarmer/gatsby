// Invoke plugins for certain actions.

const { store, emitter } = require(`./index`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const { graphql } = require(`graphql`)

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

  // TODO: compare pages before & after running create pages

  const graphqlRunner = (query, context = {}) => {
    const schema = store.getState().schema
    return graphql(schema, query, context, context, context)
  }

  apiRunnerNode(`createPages`, {
    graphql: graphqlRunner,
    traceId: `watch-createPages`,
    waitForCascadingActions: true,
  })
    .then((result) => {
      console.log(`plugin-watcher createPages RESULT:`, result)
    })
    .catch((err) => {
      console.warn(`plugin-watcher createPages error:`, err)
    })
})
