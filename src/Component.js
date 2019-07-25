import { beforeSlice } from './util'

export default function Component (config) {
  const computed = config.computed
  delete config.computed
  const watch = config.watch
  delete config.watch
  beforeSlice(config, 'onInit', function (...args) {
    this.$store = global.$store
    computed && global.$makeComputed(this, computed, config)
    if (watch) {
      Object.keys(watch).forEach(key => {
        this.$watch(key, watch[key])
      })
    }
    if (config.beforeCreate) {
      config.beforeCreate.apply(this, args)
    }
  })
  beforeSlice(config, 'onReady', function (...args) {
    if (config.created) {
      config.created.apply(this, args)
    }
  })
  if (config.methods) {
    Object.keys(config.methods).forEach(key => {
      if (config[key]) return
      config[key] = config.methods[key]
    })
    delete config.methods
  }
  if (watch) {
    Object.keys(watch).forEach((key, index) => {
      if (typeof watch[key] === 'function') {
        const callbackname = 'on_Data_Change' + '_' + index
        config[callbackname] = watch[key]
        watch[key] = callbackname
        console.log('1', watch, callbackname, config)
      }
    })
  }
  return config
}
