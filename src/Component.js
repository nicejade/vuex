import { beforeSlice } from './util'
export default function Component (config) {
  const computed = config.computed
  delete config.computed
  beforeSlice(config, 'onInit', function() {
    this.$store = global.$store
    computed && global.$makeComputed(this, computed, config)
  })
  return config
}
