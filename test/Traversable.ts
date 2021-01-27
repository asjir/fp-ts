import { pipe } from '../src/function'
import * as _ from '../src/Traversable'
import * as RA from '../src/ReadonlyArray'
import * as R from '../src/ReadonlyRecord'
import * as O from '../src/Option'
import { deepStrictEqual } from './util'

describe('Traversable', () => {
  it('traverse', () => {
    const traverse = _.traverse(R.Traversable, RA.Traversable)
    deepStrictEqual(
      pipe(
        { a: [1, 2], b: [3] },
        traverse(O.Applicative)((a) => (a > 0 ? O.some(a) : O.none))
      ),
      O.some({ a: [1, 2], b: [3] })
    )
    deepStrictEqual(
      pipe(
        { a: [1, -2], b: [3] },
        traverse(O.Applicative)((a) => (a > 0 ? O.some(a) : O.none))
      ),
      O.none
    )
  })

  it('sequence', () => {
    const sequence = _.sequence(R.Traversable, RA.Traversable)(O.Applicative)
    deepStrictEqual(pipe({ a: [O.some(1), O.some(2)], b: [O.some(3)] }, sequence), O.some({ a: [1, 2], b: [3] }))
    deepStrictEqual(pipe({ a: [O.some(1), O.none], b: [O.some(3)] }, sequence), O.none)
  })
})