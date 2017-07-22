// Invoke plugins for certain actions.

const { store, emitter } = require(`./index`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const { graphql } = require(`graphql`)

emitter.on(`CREATE_NODE`, action => {
  console.log(`plugin-watcher CREATE_NODE`, action.traceId)

  const graphqlRunner = (query, context = {}) => {
    const schema = store.getState().schema
    return graphql(schema, query, context, context, context)
  }

  apiRunnerNode(`createPages`, {
    graphql: graphqlRunner,
    traceId: action.traceId,
    waitForCascadingActions: true,
  })
    .then((result) => {
      console.log(`plugin-watcher createPages RESULT:`, result)
    })
    .catch((err) => {
      console.warn(`plugin-watcher createPages error:`, err)
    })
})
