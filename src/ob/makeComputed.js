import ob from './ob.js'
export default function makeComputed (config) {
  let state = config.state
  ob.observe(state)
  const getter = {}
  if (config.getters) {
    Object.keys(config.getters).map(key => {
      ob.compute(getter, key, function () {
        return config.getters[key](state)
      })
    })
  }
  return [getter, state]
}
