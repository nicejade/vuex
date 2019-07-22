import { beforeSlice } from './util'
export default function Component (config) {
  const computed = config.computed
  delete config.computed
  beforeSlice(config, 'onInit', function() {
    this.$store = global.$store
    Object.keys(computed).forEach(key => {
      global.$ob.compute(this, key, computed[key])
    })
  })
  return config
}
