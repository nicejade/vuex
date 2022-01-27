let uid = 0

/**
 * A dep is an observable that can have multiple
 * watcher subscribing to it.
 */
class Dep {
  // the current target watcher being evaluated.
  // this is globally unique because there could be only one
  // watcher being evaluated at any time.

  constructor () {
    this.id = uid++
    this.subs = []
  }

  /**
   * Add a subscriber.
   *
   * @param {Watcher} sub
   */

  addSub (sub) {
    this.subs.push(sub)
  }

  /**
   * Remove a subscriber.
   *
   * @param {Watcher} sub
   */

  removeSub (sub) {
    this.subs.$remove(sub)
  }

  /**
   * Add self as a dependency to the target watcher.
   */

  depend () {
    // @desc: Fix bug: vuex Component cannot use Array Or Object.
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  /**
   * Notify all subscribers of a new value.
   */

  notify () {
    const subs = this.subs
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}
Dep.target = null
export default Dep
