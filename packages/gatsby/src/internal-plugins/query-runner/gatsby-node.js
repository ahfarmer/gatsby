const fs = require(`fs`)
const path = require(`path`)

const { watchComponent } = require(`./query-watcher`)

let pageComponents = {}
exports.onCreatePage = ({ page, store, boundActionCreators }) => {
  console.log(`query-runner onCreatePage page:${page.path}`)

  const component = page.component
  if (!pageComponents[component]) {
    // We haven't seen this component before so we:
    // - Ensure it has a JSON file.
    // - Add it to Redux
    // - Watch the component to detect query changes
    const pathToJSONFile = path.join(
      store.getState().program.directory,
      `.cache`,
      `json`,
      page.jsonName
    )
    console.log(`query-runner/gatsby-node.js ${pathToJSONFile}`)
    if (!fs.existsSync(pathToJSONFile)) {
      fs.writeFile(pathToJSONFile, `{}`, () => {})
    }
    // process.exit()
    boundActionCreators.createPageComponent(component)

    // Make sure we're watching this component.
    watchComponent(component)
  }

  // Mark we've seen this page component.
  pageComponents[component] = component
}
