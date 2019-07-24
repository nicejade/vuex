import { Store, install } from './store'
import { mapState, mapMutations, mapGetters, mapActions, createNamespacedHelpers } from './helpers'
import Component from './Component'
console.log('test')
export default {
  Store,
  install,
  version: '__VERSION__',
  Component,
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers
}
