import * as E from '../src/Result'
import { flow, pipe } from '../src/Function'
import * as I from '../src/Sync'
import * as IE from '../src/SyncResult'
import * as N from '../src/number'
import * as O from '../src/Option'
import { gt } from '../src/Ord'
import * as R from '../src/Reader'
import * as RE from '../src/ReaderResult'
import * as RTE from '../src/ReaderAsyncResult'
import * as RA from '../src/ReadonlyArray'
import type { State } from '../src/State'
import * as _ from '../src/StateReaderAsyncResult'
import * as S from '../src/string'
import * as T from '../src/Async'
import * as TE from '../src/AsyncResult'
import { tuple } from '../src/tuple'
import * as U from './util'

const state: unknown = {}

describe('StateReaderAsyncResult', () => {
  describe('pipeables', () => {
    it('orElse', async () => {
      const assertAlt = async (
        a: _.StateReaderAsyncResult<undefined, null, string, number>,
        b: _.StateReaderAsyncResult<undefined, null, string, number>,
        expected: E.Result<string, readonly [undefined, number]>
      ) => {
        U.deepStrictEqual(await pipe(a, _.orElse(b))(undefined)(null)(), expected)
      }
      await assertAlt(_.of(1), _.of(2), E.of([undefined, 1]))
      await assertAlt(_.of(1), _.fail('b'), E.of([undefined, 1]))
      await assertAlt(_.fail('a'), _.of(2), E.of([undefined, 2]))
      await assertAlt(_.fail('a'), _.fail('b'), E.fail('b'))
    })

    it('map', async () => {
      const e = await pipe(_.of('aaa'), _.map(S.size), _.evaluate(state))({})()
      U.deepStrictEqual(e, E.of(3))
    })

    it('ap', async () => {
      const e = await pipe(_.of(S.size), _.ap(_.of('aaa')), _.evaluate(state))({})()
      U.deepStrictEqual(e, E.of(3))
    })

    it('flatMap', async () => {
      const f = (s: string) => (s.length > 2 ? _.of(s.length) : _.of(0))
      const e = await pipe(_.of('aaa'), _.flatMap(f), _.evaluate(state))({})()
      U.deepStrictEqual(e, E.of(3))
    })

    it('tap', async () => {
      const f = (s: string) => (s.length > 2 ? _.of(s.length) : _.of(0))
      const e = await pipe(_.of('aaa'), _.tap(f), _.evaluate(state))({})()
      U.deepStrictEqual(e, E.of('aaa'))
    })

    it('tap', async () => {
      const e = await pipe(_.of(_.of('a')), _.flatten, _.evaluate(state))({})()
      U.deepStrictEqual(e, E.of('a'))
    })

    it('mapBoth', async () => {
      const f = _.mapBoth(gt(N.Ord)(2), S.size)
      U.deepStrictEqual(await pipe(_.of('aaa'), f, _.evaluate(state))({})(), E.of(3))
      U.deepStrictEqual(await pipe(_.fail(3), f, _.evaluate(state))({})(), E.fail(true))
    })

    it('mapError', async () => {
      const f = _.mapError(gt(N.Ord)(2))
      U.deepStrictEqual(await pipe(_.fail(3), f, _.evaluate(state))({})(), E.fail(true))
    })

    it('fromPredicate', async () => {
      const f = _.liftPredicate((n: number) => n >= 2, 'e')
      U.deepStrictEqual(await pipe(f(3), _.evaluate(state))({})(), E.of(3))
      U.deepStrictEqual(await pipe(f(1), _.evaluate(state))({})(), E.fail('e'))
    })

    it('filter', async () => {
      const predicate = (n: number) => n > 10
      U.deepStrictEqual(await pipe(_.of(12), _.filter(predicate, -1), _.evaluate(state))({})(), E.of(12))
      U.deepStrictEqual(await pipe(_.of(7), _.filter(predicate, -1), _.evaluate(state))({})(), E.fail(-1))
      U.deepStrictEqual(await pipe(_.fail(12), _.filter(predicate, -1), _.evaluate(state))({})(), E.fail(12))
    })
  })

  // -------------------------------------------------------------------------------------
  // instances
  // -------------------------------------------------------------------------------------

  it('Applicative', async () => {
    await U.assertSeq(_.Apply, _.FromAsync, (fa) => fa(null)(null)())
    await U.assertSeq(_.Applicative, _.FromAsync, (fa) => fa(null)(null)())
  })

  // -------------------------------------------------------------------------------------
  // utils
  // -------------------------------------------------------------------------------------

  it('run', async () => {
    const ma = _.of('aaa')
    const e = await ma({})({})()
    U.deepStrictEqual(e, E.of([{}, 'aaa'] as const))
  })

  it('applicativeReaderAsyncResultSeq', async () => {
    const log: Array<string> = []
    const append = (message: string): _.StateReaderAsyncResult<{}, {}, void, number> =>
      _.fromAsync(() => Promise.resolve(log.push(message)))
    const t1 = pipe(
      append('start 1'),
      _.flatMap(() => append('end 1'))
    )
    const t2 = pipe(
      append('start 2'),
      _.flatMap(() => append('end 2'))
    )
    const sequence = RA.traverse(_.Applicative)(<S, R, E, A>(a: _.StateReaderAsyncResult<S, R, E, A>) => a)
    U.deepStrictEqual(await sequence([t1, t2])({})({})(), E.of([{}, [2, 4]] as const))
    U.deepStrictEqual(log, ['start 1', 'end 1', 'start 2', 'end 2'])
  })

  it('execute', async () => {
    const ma = _.of('a')
    const e = await pipe(ma, _.execute(state))({})()
    U.deepStrictEqual(e, E.of({}))
  })

  it('fromState', async () => {
    const s: State<unknown, number> = (s) => [s, 1]
    const e = await pipe(_.fromState(s), _.evaluate(state))({})()
    U.deepStrictEqual(e, E.of(1))
  })

  it('leftState', async () => {
    const s: State<unknown, number> = (s) => [s, 1]
    const e = await pipe(_.failState(s), _.evaluate(state))({})()
    U.deepStrictEqual(e, E.fail(1))
  })

  it('fromReaderAsyncResult', async () => {
    const rte: RTE.ReaderAsyncResult<{}, string, number> = RTE.of(1)
    const e = await pipe(_.fromReaderAsyncResult(rte), _.evaluate(state))({})()
    U.deepStrictEqual(e, E.of(1))
  })

  it('fromState', async () => {
    const s: State<unknown, number> = (s) => [s, 1]
    const e = await pipe(_.fromState(s), _.evaluate(state))({})()
    U.deepStrictEqual(e, E.of(1))
  })

  it('left', async () => {
    const e = await _.fail(1)({})({})()
    U.deepStrictEqual(e, E.fail(1))
  })

  it('fromAsync', async () => {
    const e = await _.fromAsync(T.of(1))({})({})()
    U.deepStrictEqual(e, E.of([{}, 1] as const))
  })

  it('leftAsync', async () => {
    const e = await _.failAsync(T.of(1))({})({})()
    U.deepStrictEqual(e, E.fail(1))
  })

  it('fromAsyncResult', async () => {
    const e = await _.fromAsyncResult(TE.of(1))({})({})()
    U.deepStrictEqual(e, E.of([{}, 1] as const))
  })

  it('fromReader', async () => {
    const e = await _.fromReader(R.of(1))({})({})()
    U.deepStrictEqual(e, E.of([{}, 1] as const))
  })

  it('leftReader', async () => {
    const e = await _.failReader(R.of(1))({})({})()
    U.deepStrictEqual(e, E.fail(1))
  })

  it('fromSyncResult', async () => {
    const e1 = await _.fromSyncResult(IE.of(1))({})({})()
    U.deepStrictEqual(e1, E.of([{}, 1] as const))
    const e2 = await _.fromSyncResult(IE.fail(1))({})({})()
    U.deepStrictEqual(e2, E.fail(1))
  })

  it('fromResult', async () => {
    const e1 = await _.fromResult(E.of(1))({})({})()
    U.deepStrictEqual(e1, E.of([{}, 1] as const))
    const e2 = await _.fromResult(E.fail(1))({})({})()
    U.deepStrictEqual(e2, E.fail(1))
  })

  it('fromOption', async () => {
    const e1 = await _.fromOption('err')(O.some(1))({})({})()
    U.deepStrictEqual(e1, E.of([{}, 1] as const))
    const e2 = await _.fromOption('err')(O.none)({})({})()
    U.deepStrictEqual(e2, E.fail('err'))
  })

  it('fromSync', async () => {
    const e = await _.fromSync(I.of(1))({})({})()
    U.deepStrictEqual(e, E.of([{}, 1] as const))
  })

  it('failSync', async () => {
    const e = await _.failSync(I.of(1))({})({})()
    U.deepStrictEqual(e, E.fail(1))
  })

  it('fromOption', async () => {
    const e1 = await _.fromOption('none')(O.none)({})({})()
    U.deepStrictEqual(e1, E.fail('none'))
    const e2 = await _.fromOption(() => 'none')(O.some(1))({})({})()
    U.deepStrictEqual(e2, E.of([{}, 1] as const))
  })

  it('fromReaderResult', async () => {
    const e1 = await _.fromReaderResult(RE.fail('a'))({})({})()
    U.deepStrictEqual(e1, E.fail('a'))
    const e2 = await _.fromReaderResult(RE.of(1))({})({})()
    U.deepStrictEqual(e2, E.of([{}, 1] as const))
  })

  it('flatMapResult', async () => {
    const f = flow(S.size, E.of)
    const x = await pipe(_.of('a'), _.flatMapResult(f))(undefined)(undefined)()
    U.deepStrictEqual(x, E.of([undefined, 1] as const))
  })

  it('flatMapSyncResult', async () => {
    const f = flow(S.size, IE.of)
    const x = await pipe(_.of('a'), _.flatMapSyncResult(f))(undefined)(undefined)()
    U.deepStrictEqual(x, E.of([undefined, 1] as const))
  })

  it('flatMapAsyncResult', async () => {
    const f = flow(S.size, TE.of)
    const x = await pipe(_.of('a'), _.flatMapAsyncResult(f))(undefined)(undefined)()
    U.deepStrictEqual(x, E.of([undefined, 1] as const))
  })

  it('flatMapReaderAsyncResult', async () => {
    const f = flow(S.size, RTE.of)
    const x = await pipe(_.of('a'), _.flatMapReaderAsyncResult(f))(undefined)(undefined)()
    U.deepStrictEqual(x, E.of([undefined, 1] as const))
  })

  it('put', async () => {
    U.deepStrictEqual(await _.put(2)(1)({})(), E.of([2, undefined] as const))
  })

  it('get', async () => {
    U.deepStrictEqual(await _.get()(1)({})(), E.of([1, 1] as const))
  })

  it('modify', async () => {
    U.deepStrictEqual(await _.modify(U.double)(1)({})(), E.of([2, undefined] as const))
  })

  it('gets', async () => {
    U.deepStrictEqual(await _.gets(U.double)(1)({})(), E.of([1, 2] as const))
  })

  it('do notation', async () => {
    U.deepStrictEqual(
      await pipe(
        _.of(1),
        _.bindTo('a'),
        _.bind('b', () => _.of('b'))
      )(undefined)(undefined)(),
      E.of([undefined, { a: 1, b: 'b' }] as const)
    )
  })

  it('apS', async () => {
    U.deepStrictEqual(
      await pipe(_.of(1), _.bindTo('a'), _.bindRight('b', _.of('b')))(undefined)(undefined)(),
      E.of([undefined, { a: 1, b: 'b' }] as const)
    )
  })

  it('zipFlatten', async () => {
    U.deepStrictEqual(await pipe(_.of(1), _.tupled, _.zipFlatten(_.of('b')))({})({})(), E.of([{}, [1, 'b']] as const))
  })

  it('liftState', async () => {
    const ma = _.liftState(
      (n: number): State<number, number> =>
        (s) =>
          [s + 1, n * 2]
    )
    U.deepStrictEqual(await ma(3)(2)({})(), E.of([3, 6] as const))
  })

  it('flatMapState', async () => {
    const f = _.flatMapState(
      (n: number): State<number, number> =>
        (s) =>
          [s + 1, n * 2]
    )
    const right: _.StateReaderAsyncResult<number, unknown, never, number> = _.of(3)
    U.deepStrictEqual(await pipe(right, f)(2)({})(), E.of([3, 6] as const))
    const left: _.StateReaderAsyncResult<number, unknown, string, number> = _.fail('a')
    U.deepStrictEqual(await pipe(left, f)(2)({})(), E.fail('a'))
  })

  it('asksE', async () => {
    interface Env {
      readonly count: number
    }
    const e: Env = { count: 0 }
    const f = (e: Env) => _.of(e.count + 1)
    U.deepStrictEqual(await _.asksStateReaderAsyncResult(f)({})(e)(), E.of(tuple({}, 1)))
  })

  it('local', async () => {
    U.deepStrictEqual(
      await pipe(
        _.asks((n: number) => n + 1),
        _.local(S.size)
      )({})('aaa')(),
      E.of(tuple({}, 4))
    )
  })

  it('tapError', async () => {
    const f = _.tapError(() => _.modify((s: number) => s + 1))
    U.deepStrictEqual(await pipe(_.of<number, number>(1), f)(0)(null)(), E.of([0, 1] as const))
    U.deepStrictEqual(await pipe(_.fail<string, number>('a'), f)(0)(null)(), E.fail('a'))
  })

  // -------------------------------------------------------------------------------------
  // array utils
  // -------------------------------------------------------------------------------------

  it('traverseReadonlyArrayWithIndex', async () => {
    const f = _.traverseReadonlyArrayWithIndex((i, a: string) => (a.length > 0 ? _.of(a + i) : _.fail('e')))
    U.deepStrictEqual(await pipe(RA.empty, f)(undefined)(undefined)(), E.of([undefined, RA.empty] as const))
    U.deepStrictEqual(await pipe(['a', 'b'], f)(undefined)(undefined)(), E.of([undefined, ['a0', 'b1']] as const))
    U.deepStrictEqual(await pipe(['a', ''], f)(undefined)(undefined)(), E.fail('e'))
    const append = (_i: number, n: number): _.StateReaderAsyncResult<ReadonlyArray<number>, {}, Error, void> =>
      _.modify((a) => [...a, n])
    U.deepStrictEqual(
      await pipe(
        [1, 2, 3],
        _.traverseReadonlyArrayWithIndex(append),
        _.map(() => undefined)
      )([])({})(),
      E.of([[1, 2, 3], undefined] as const)
    )
  })

  it('traverseNonEmptyReadonlyArray', async () => {
    const f = _.traverseNonEmptyReadonlyArray((a: string) => (a.length > 0 ? _.of(a) : _.fail('e')))
    U.deepStrictEqual(await pipe(['a', 'b'], f)(undefined)(undefined)(), E.of([undefined, ['a', 'b']] as const))
    U.deepStrictEqual(await pipe(['a', ''], f)(undefined)(undefined)(), E.fail('e'))
    const append = (n: number): _.StateReaderAsyncResult<ReadonlyArray<number>, {}, Error, void> =>
      _.modify((a) => [...a, n])
    U.deepStrictEqual(
      await pipe(
        [1, 2, 3],
        _.traverseNonEmptyReadonlyArray(append),
        _.map(() => undefined)
      )([])({})(),
      E.of([[1, 2, 3], undefined] as const)
    )
  })

  it('sequenceReadonlyArray', async () => {
    const log: Array<number | string> = []
    const right = (n: number): _.StateReaderAsyncResult<undefined, undefined, string, number> =>
      _.fromSync(() => {
        log.push(n)
        return n
      })
    const left = (s: string): _.StateReaderAsyncResult<undefined, undefined, string, number> =>
      _.failSync(() => {
        log.push(s)
        return s
      })
    U.deepStrictEqual(
      await pipe([right(1), right(2)], _.sequenceReadonlyArray)(undefined)(undefined)(),
      E.of([undefined, [1, 2]] as const)
    )
    U.deepStrictEqual(await pipe([right(3), left('a')], _.sequenceReadonlyArray)(undefined)(undefined)(), E.fail('a'))
    U.deepStrictEqual(await pipe([left('b'), right(4)], _.sequenceReadonlyArray)(undefined)(undefined)(), E.fail('b'))
    U.deepStrictEqual(log, [1, 2, 3, 'a', 'b'])
  })
})