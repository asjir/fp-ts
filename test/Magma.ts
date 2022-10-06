import { increment, pipe } from '../src/Function'
import * as _ from '../src/Magma'
import type { NonEmptyReadonlyArray } from '../src/NonEmptyReadonlyArray'
import * as N from '../src/number'
import * as U from './util'

describe('Magma', () => {
  it('reverse', () => {
    const subAll = _.combineAll(_.reverse(N.MagmaSub))(0)
    U.deepStrictEqual(subAll([1, 2, 3]), 2)
  })

  it('filterFirst', () => {
    const M = pipe(
      N.SemigroupSum,
      _.filterFirst((n) => n >= 0)
    )
    // sum ignoring negative partials
    const sum = _.combineAll(M)(0)
    U.deepStrictEqual(sum([1, -2, 3]), 3)
  })

  it('filterSecond', () => {
    const M = pipe(
      N.SemigroupSum,
      _.filterSecond((n) => n >= 0)
    )
    // sum ignoring negative elements
    const sum = _.combineAll(M)(0)
    U.deepStrictEqual(sum([1, -2, 3]), 4)
  })

  it('endo', () => {
    const M = pipe(N.SemigroupSum, _.endo(increment))
    const sum = _.combineAll(M)(0)
    U.deepStrictEqual(sum([1, -2, 3]), 8)
  })

  it('combineAll', () => {
    const subAll = _.combineAll(N.MagmaSub)(0)
    U.deepStrictEqual(subAll([1, 2, 3]), -6)
    U.deepStrictEqual(subAll(new Set([1, 2, 3])), -6)
    const nea: NonEmptyReadonlyArray<number> = [1, 2, 3]
    U.deepStrictEqual(subAll(nea), -6)
  })
})
