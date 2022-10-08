/**
 * ```ts
 * type Result<E, A> = Failure<E> | Success<A>
 * ```
 *
 * Represents a value of one of two possible types (a disjoint union).
 *
 * An instance of `Result` is either an instance of `Failure` or `Success`.
 *
 * A common use of `Result` is as an alternative to `Option` for dealing with possible missing values. In this usage,
 * `None` is replaced with a `Failure` which can contain useful information. `Success` takes the place of `Some`. Convention
 * dictates that `Failure` is used for failure and `Success` is used for success.
 *
 * @since 3.0.0
 */
import type * as kleisliCategory from './KleisliCategory'
import type * as kleisliComposable from './KleisliComposable'
import type * as alt from './Alt'
import type * as applicative from './Applicative'
import * as apply from './Apply'
import * as bifunctor from './Bifunctor'
import * as flattenable from './Flattenable'
import * as flattenableRec from './FlattenableRec'
import type { Compactable } from './Compactable'
import * as eq from './Eq'
import type * as extendable from './Extendable'
import type * as filterable from './Filterable'
import * as iterable from './Iterable'
import type { Monoid } from './Monoid'
import * as foldable from './Foldable'
import * as fromResult_ from './FromResult'
import { SK } from './Function'
import { flow, identity, pipe } from './Function'
import * as functor from './Functor'
import type { TypeLambda, Kind } from './HKT'
import * as _ from './internal'
import type * as monad from './Monad'
import type { Option } from './Option'
import * as fromIdentity from './FromIdentity'
import type { Predicate } from './Predicate'
import type { NonEmptyReadonlyArray } from './NonEmptyReadonlyArray'
import type { Refinement } from './Refinement'
import type { Semigroup } from './Semigroup'
import type { Show } from './Show'
import * as traversable from './Traversable'
import type { TraversableFilterable } from './TraversableFilterable'

/**
 * @category model
 * @since 3.0.0
 */
export interface Failure<E> {
  readonly _tag: 'Failure'
  readonly failure: E
}

/**
 * @category model
 * @since 3.0.0
 */
export interface Success<A> {
  readonly _tag: 'Success'
  readonly success: A
}

/**
 * @category model
 * @since 3.0.0
 */
export type Result<E, A> = Failure<E> | Success<A>

// -------------------------------------------------------------------------------------
// type lambdas
// -------------------------------------------------------------------------------------

/**
 * @category type lambdas
 * @since 3.0.0
 */
export interface ResultTypeLambda extends TypeLambda {
  readonly type: Result<this['Out2'], this['Out1']>
}

/**
 * @category type lambdas
 * @since 3.0.0
 */
export interface ResultTypeLambdaFix<E> extends TypeLambda {
  readonly type: Result<E, this['Out1']>
}

/**
 * @category type lambdas
 * @since 3.0.0
 */
export interface ValidatedT<F extends TypeLambda, E> extends TypeLambda {
  readonly type: Kind<F, this['InOut1'], this['In1'], this['Out3'], E, this['Out1']>
}

/**
 * Returns `true` if the either is an instance of `Failure`, `false` otherwise.
 *
 * @category refinements
 * @since 3.0.0
 */
export const isFailure: <E>(ma: Result<E, unknown>) => ma is Failure<E> = _.isFailure

/**
 * Returns `true` if the either is an instance of `Success`, `false` otherwise.
 *
 * @category refinements
 * @since 3.0.0
 */
export const isSuccess: <A>(ma: Result<unknown, A>) => ma is Success<A> = _.isSuccess

/**
 * Constructs a new `Result` holding a `Failure` value. This usually represents a failure, due to the right-bias of this
 * structure.
 *
 * @category constructors
 * @since 3.0.0
 */
export const fail: <E>(e: E) => Result<E, never> = _.fail

/**
 * Constructs a new `Result` holding a `Success` value. This usually represents a successful value due to the right bias
 * of this structure.
 *
 * @category constructors
 * @since 3.0.0
 */
export const of: <A>(a: A) => Result<never, A> = _.of

// -------------------------------------------------------------------------------------
// pattern matching
// -------------------------------------------------------------------------------------

/**
 * Takes two functions and an `Result` value, if the value is a `Failure` the inner value is applied to the first function,
 * if the value is a `Success` the inner value is applied to the second function.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 *
 * const onError  = (errors: ReadonlyArray<string>): string => `Errors: ${errors.join(', ')}`
 *
 * const onSuccess = (value: number): string => `Ok: ${value}`
 *
 * assert.strictEqual(
 *   pipe(
 *     E.of(1),
 *     E.match(onError , onSuccess)
 *   ),
 *   'Ok: 1'
 * )
 * assert.strictEqual(
 *   pipe(
 *     E.fail(['error 1', 'error 2']),
 *     E.match(onError , onSuccess)
 *   ),
 *   'Errors: error 1, error 2'
 * )
 *
 * @category pattern matching
 * @since 3.0.0
 */
export const match =
  <E, B, A, C = B>(onError: (e: E) => B, onSuccess: (a: A) => C) =>
  (self: Result<E, A>): B | C =>
    isFailure(self) ? onError(self.failure) : onSuccess(self.success)

/**
 * Returns the wrapped value if it's a `Success` or a default value if is a `Failure`.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     E.of(1),
 *     E.getOrElse(0)
 *   ),
 *   1
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.fail('error'),
 *     E.getOrElse(0)
 *   ),
 *   0
 * )
 *
 * @category error handling
 * @since 3.0.0
 */
export const getOrElse =
  <B>(onError: B) =>
  <A>(self: Result<unknown, A>): A | B =>
    isFailure(self) ? onError : self.success

/**
 * Takes a lazy default and a nullable value, if the value is not nully, turn it into a `Success`, if the value is nully use
 * the provided default as a `Failure`.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 *
 * const parse = E.fromNullable('nully')
 *
 * assert.deepStrictEqual(parse(1), E.of(1))
 * assert.deepStrictEqual(parse(null), E.fail('nully'))
 *
 * @category conversions
 * @since 3.0.0
 */
export const fromNullable: <E>(onNullable: E) => <A>(a: A) => Result<E, NonNullable<A>> = _.eitherFromNullable

/**
 * @category lifting
 * @since 3.0.0
 */
export const liftNullable = <A extends ReadonlyArray<unknown>, B, E>(
  f: (...a: A) => B | null | undefined,
  onNullable: E
) => {
  const from = fromNullable(onNullable)
  return (...a: A): Result<E, NonNullable<B>> => from(f(...a))
}

/**
 * @category sequencing
 * @since 3.0.0
 */
export const flatMapNullable = <A, B, E2>(
  f: (a: A) => B | null | undefined,
  onNullable: E2
): (<E1>(self: Result<E1, A>) => Result<E1 | E2, NonNullable<B>>) => flatMap(liftNullable(f, onNullable))

/**
 * Constructs a new `Result` from a function that might throw.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 * import { identity } from 'fp-ts/Function'
 *
 * const unsafeHead = <A>(as: ReadonlyArray<A>): A => {
 *   if (as.length > 0) {
 *     return as[0]
 *   } else {
 *     throw new Error('empty array')
 *   }
 * }
 *
 * const head = <A>(as: ReadonlyArray<A>): E.Result<unknown, A> =>
 *   E.fromThrowable(() => unsafeHead(as), identity)
 *
 * assert.deepStrictEqual(head([]), E.fail(new Error('empty array')))
 * assert.deepStrictEqual(head([1, 2, 3]), E.of(1))
 *
 * @see {@link liftThrowable}
 * @category interop
 * @since 3.0.0
 */
export const fromThrowable = <A, E>(f: () => A, onThrow: (error: unknown) => E): Result<E, A> => {
  try {
    return of(f())
  } catch (e) {
    return fail(onThrow(e))
  }
}

/**
 * Lifts a function that may throw to one returning a `Result`.
 *
 * @category interop
 * @since 3.0.0
 */
export const liftThrowable =
  <A extends ReadonlyArray<unknown>, B, E>(
    f: (...a: A) => B,
    onThrow: (error: unknown) => E
  ): ((...a: A) => Result<E, B>) =>
  (...a) =>
    fromThrowable(() => f(...a), onThrow)

/**
 * @category conversions
 * @since 3.0.0
 */
export const toUnion: <E, A>(fa: Result<E, A>) => E | A = /*#__PURE__*/ match(identity, identity)

/**
 * @since 3.0.0
 */
export const swap = <E, A>(ma: Result<E, A>): Result<A, E> => (isFailure(ma) ? of(ma.failure) : fail(ma.success))

/**
 * Recovers from all errors.
 *
 * @category error handling
 * @since 3.0.0
 */
export const catchAll: <E1, E2, B>(
  onError: (e: E1) => Result<E2, B>
) => <A>(self: Result<E1, A>) => Result<E2, A | B> = (onError) => (self) =>
  isFailure(self) ? onError(self.failure) : self

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category mapping
 * @since 3.0.0
 */
export const mapBoth: <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => (self: Result<E, A>) => Result<G, B> =
  (f, g) => (fa) =>
    isFailure(fa) ? fail(f(fa.failure)) : of(g(fa.success))

/**
 * @category sequencing
 * @since 3.0.0
 */
export const flatMapRec = <A, E, B>(f: (a: A) => Result<E, Result<A, B>>): ((a: A) => Result<E, B>) =>
  flow(
    f,
    flattenableRec.tailRec<Result<E, Result<A, B>>, Result<E, B>>((e) =>
      isFailure(e) ? of(fail(e.failure)) : isFailure(e.success) ? fail(f(e.success.failure)) : of(of(e.success.success))
    )
  )

/**
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to
 * types of kind `* -> *`.
 *
 * In case of `Result` returns the left-most non-`Failure` value (or the right-most `Failure` value if both values are `Failure`).
 *
 * | x          | y          | pipe(x, orElse(y) |
 * | ---------- | ---------- | ------------------|
 * | fail(a)    | fail(b)    | fail(b)           |
 * | fail(a)    | of(2) | of(2)        |
 * | of(1) | fail(b)    | of(1)        |
 * | of(1) | of(2) | of(1)        |
 *
 * @example
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     E.fail('a'),
 *     E.orElse(E.fail('b'))
 *   ),
 *   E.fail('b')
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.fail('a'),
 *     E.orElse(E.of(2))
 *   ),
 *   E.of(2)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.of(1),
 *     E.orElse(E.fail('b'))
 *   ),
 *   E.of(1)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.of(1),
 *     E.orElse(E.of(2))
 *   ),
 *   E.of(1)
 * )
 *
 * @category error handling
 * @since 3.0.0
 */
export const orElse: <E2, B>(that: Result<E2, B>) => <E1, A>(self: Result<E1, A>) => Result<E2, A | B> =
  (that) => (fa) =>
    isFailure(fa) ? that : fa

/**
 * @since 3.0.0
 */
export const extend: <E, A, B>(f: (wa: Result<E, A>) => B) => (wa: Result<E, A>) => Result<E, B> = (f) => (wa) =>
  isFailure(wa) ? wa : of(f(wa))

/**
 * @since 3.0.0
 */
export const duplicate: <E, A>(ma: Result<E, A>) => Result<E, Result<E, A>> = /*#__PURE__*/ extend(identity)

/**
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results.
 *
 * @example
 * import { pipe } from 'fp-ts/Function'
 * import * as RA from 'fp-ts/ReadonlyArray'
 * import * as E from 'fp-ts/Result'
 * import * as O from 'fp-ts/Option'
 *
 * assert.deepStrictEqual(
 *   pipe(E.of(['a']), E.traverse(O.Applicative)(RA.head)),
 *   O.some(E.of('a')),
 *  )
 *
 * assert.deepStrictEqual(
 *   pipe(E.of([]), E.traverse(O.Applicative)(RA.head)),
 *   O.none,
 * )
 *
 * @category traversing
 * @since 3.0.0
 */
export const traverse =
  <F extends TypeLambda>(F: applicative.Applicative<F>) =>
  <A, FS, FR, FO, FE, B>(f: (a: A) => Kind<F, FS, FR, FO, FE, B>) =>
  <E>(ta: Result<E, A>): Kind<F, FS, FR, FO, FE, Result<E, B>> =>
    isFailure(ta) ? F.of(fail(ta.failure)) : pipe(f(ta.success), F.map(of))

/**
 * @category instances
 * @since 3.0.0
 */
export const getShow = <E, A>(SE: Show<E>, SA: Show<A>): Show<Result<E, A>> => ({
  show: (ma) => (isFailure(ma) ? `fail(${SE.show(ma.failure)})` : `of(${SA.show(ma.success)})`)
})

/**
 * @category instances
 * @since 3.0.0
 */
export const getEq = <E, A>(EE: eq.Eq<E>, EA: eq.Eq<A>): eq.Eq<Result<E, A>> =>
  eq.fromEquals(
    (that) => (self) =>
      isFailure(self)
        ? isFailure(that) && EE.equals(that.failure)(self.failure)
        : isSuccess(that) && EA.equals(that.success)(self.success)
  )

/**
 * Semigroup returning the left-most non-`Failure` value. If both operands are `Success`es then the inner values are
 * combined using the provided `Semigroup`.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 * import * as N from 'fp-ts/number'
 * import { pipe } from 'fp-ts/Function'
 *
 * const S = E.getSemigroup<number, string>(N.SemigroupSum)
 * assert.deepStrictEqual(pipe(E.fail('a'), S.combine(E.fail('b'))), E.fail('a'))
 * assert.deepStrictEqual(pipe(E.fail('a'), S.combine(E.of(2))), E.of(2))
 * assert.deepStrictEqual(pipe(E.of(1), S.combine(E.fail('b'))), E.of(1))
 * assert.deepStrictEqual(pipe(E.of(1), S.combine(E.of(2))), E.of(3))
 *
 * @category instances
 * @since 3.0.0
 */
export const getSemigroup = <A, E>(S: Semigroup<A>): Semigroup<Result<E, A>> => ({
  combine: (that) => (self) =>
    isFailure(that) ? self : isFailure(self) ? that : of(S.combine(that.success)(self.success))
})

/**
 * @category filtering
 * @since 3.0.0
 */
export const compact: <E>(onNone: E) => <A>(self: Result<E, Option<A>>) => Result<E, A> = (e) => (self) =>
  isFailure(self) ? self : _.isNone(self.success) ? fail(e) : of(self.success.value)

/**
 * @category filtering
 * @since 3.0.0
 */
export const separate: <E>(
  onEmpty: E
) => <A, B>(self: Result<E, Result<A, B>>) => readonly [Result<E, A>, Result<E, B>] = (onEmpty) => {
  return (self) =>
    isFailure(self)
      ? [self, self]
      : isFailure(self.success)
      ? [of(self.success.failure), fail(onEmpty)]
      : [fail(onEmpty), of(self.success.success)]
}

/**
 * @category instances
 * @since 3.0.0
 */
export const getCompactable = <E>(onNone: E): Compactable<ValidatedT<ResultTypeLambda, E>> => {
  return {
    compact: compact(onNone)
  }
}

/**
 * @category instances
 * @since 3.0.0
 */
export const getFilterable = <E>(onEmpty: E): filterable.Filterable<ValidatedT<ResultTypeLambda, E>> => {
  return {
    filterMap: (f) => filterMap(f, onEmpty)
  }
}

/**
 * @category filtering
 * @since 3.0.0
 */
export const traverseFilterMap = <F extends TypeLambda>(Applicative: applicative.Applicative<F>) => {
  const traverse_ = traverse(Applicative)
  return <A, S, R, O, FE, B, E>(
    f: (a: A) => Kind<F, S, R, O, FE, Option<B>>,
    onNone: E
  ): ((self: Result<E, A>) => Kind<F, S, R, O, FE, Result<E, B>>) => {
    return flow(traverse_(f), Applicative.map(compact(onNone)))
  }
}

/**
 * @category filtering
 * @since 3.0.0
 */
export const traversePartitionMap = <F extends TypeLambda>(Applicative: applicative.Applicative<F>) => {
  const traverse_ = traverse(Applicative)
  return <A, S, R, O, FE, B, C, E>(
    f: (a: A) => Kind<F, S, R, O, FE, Result<B, C>>,
    onNone: E
  ): ((self: Result<E, A>) => Kind<F, S, R, O, FE, readonly [Result<E, B>, Result<E, C>]>) => {
    return flow(traverse_(f), Applicative.map(separate(onNone)))
  }
}

/**
 * @category instances
 * @since 3.0.0
 */
export const getTraversableFilterable = <E>(onEmpty: E): TraversableFilterable<ValidatedT<ResultTypeLambda, E>> => {
  return {
    traverseFilterMap: (Applicative) => {
      const traverseFilterMap_ = traverseFilterMap(Applicative)
      return (f) => traverseFilterMap_(f, onEmpty)
    },
    traversePartitionMap: (Applicative) => {
      const traversePartitionMap_ = traversePartitionMap(Applicative)
      return (f) => traversePartitionMap_(f, onEmpty)
    }
  }
}

/**
 * @category instances
 * @since 3.0.0
 */
export const Bifunctor: bifunctor.Bifunctor<ResultTypeLambda> = {
  mapBoth
}

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @category error handling
 * @since 3.0.0
 */
export const mapError: <E, G>(f: (e: E) => G) => <A>(self: Result<E, A>) => Result<G, A> =
  /*#__PURE__*/ bifunctor.mapLeft(Bifunctor)

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @category mapping
 * @since 3.0.0
 */
export const map: <A, B>(f: (a: A) => B) => <E>(fa: Result<E, A>) => Result<E, B> =
  /*#__PURE__*/ bifunctor.map(Bifunctor)

/**
 * @category instances
 * @since 3.0.0
 */
export const Functor: functor.Functor<ResultTypeLambda> = {
  map
}

/**
 * @category mapping
 * @since 3.0.0
 */
export const flap: <A>(a: A) => <E, B>(fab: Result<E, (a: A) => B>) => Result<E, B> =
  /*#__PURE__*/ functor.flap(Functor)

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @category mapping
 * @since 3.0.0
 */
export const as: <B>(b: B) => <E>(self: Result<E, unknown>) => Result<E, B> = /*#__PURE__*/ functor.as(Functor)

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 *
 * @category mapping
 * @since 3.0.0
 */
export const unit: <E>(self: Result<E, unknown>) => Result<E, void> = /*#__PURE__*/ functor.unit(Functor)

/**
 * @category instances
 * @since 3.0.0
 */
export const FromIdentity: fromIdentity.FromIdentity<ResultTypeLambda> = {
  of
}

/**
 * @category sequencing
 * @since 3.0.0
 */
export const flatMap: <A, E2, B>(f: (a: A) => Result<E2, B>) => <E1>(self: Result<E1, A>) => Result<E1 | E2, B> =
  (f) => (self) =>
    isFailure(self) ? self : f(self.success)

/**
 * The `flatten` function is the conventional monad join operator. It is used to remove one level of monadic structure, projecting its bound argument into the outer level.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 *
 * assert.deepStrictEqual(E.flatten(E.of(E.of('a'))), E.of('a'))
 * assert.deepStrictEqual(E.flatten(E.of(E.fail('e'))), E.fail('e'))
 * assert.deepStrictEqual(E.flatten(E.fail('e')), E.fail('e'))
 *
 * @category sequencing
 * @since 3.0.0
 */
export const flatten: <E1, E2, A>(mma: Result<E1, Result<E2, A>>) => Result<E1 | E2, A> =
  /*#__PURE__*/ flatMap(identity)

/**
 * @category instances
 * @since 3.0.0
 */
export const Flattenable: flattenable.Flattenable<ResultTypeLambda> = {
  map,
  flatMap
}

/**
 * @since 3.0.0
 */
export const composeKleisli: <B, E2, C>(
  bfc: (b: B) => Result<E2, C>
) => <A, E1>(afb: (a: A) => Result<E1, B>) => (a: A) => Result<E2 | E1, C> =
  /*#__PURE__*/ flattenable.composeKleisli(Flattenable)

/**
 * @category instances
 * @since 3.0.0
 */
export const KleisliComposable: kleisliComposable.KleisliComposable<ResultTypeLambda> = {
  composeKleisli
}

/**
 * @since 3.0.0
 */
export const idKleisli: <A>() => (a: A) => Result<never, A> = /*#__PURE__*/ fromIdentity.idKleisli(FromIdentity)

/**
 * @category instances
 * @since 3.0.0
 */
export const CategoryKind: kleisliCategory.KleisliCategory<ResultTypeLambda> = {
  composeKleisli,
  idKleisli
}

/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @category sequencing
 * @since 3.0.0
 */
export const zipLeft: <E2>(that: Result<E2, unknown>) => <E1, A>(self: Result<E1, A>) => Result<E2 | E1, A> =
  /*#__PURE__*/ flattenable.zipLeft(Flattenable)

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @category sequencing
 * @since 3.0.0
 */
export const zipRight: <E2, A>(that: Result<E2, A>) => <E1>(self: Result<E1, unknown>) => Result<E2 | E1, A> =
  /*#__PURE__*/ flattenable.zipRight(Flattenable)

/**
 * @since 3.0.0
 */
export const ap: <E2, A>(fa: Result<E2, A>) => <E1, B>(fab: Result<E1, (a: A) => B>) => Result<E1 | E2, B> =
  /*#__PURE__*/ flattenable.ap(Flattenable)

/**
 * @category instances
 * @since 3.0.0
 */
export const Apply: apply.Apply<ResultTypeLambda> = {
  map,
  ap
}

/**
 * Lifts a binary function into `Result`.
 *
 * @category lifting
 * @since 3.0.0
 */
export const lift2: <A, B, C>(
  f: (a: A, b: B) => C
) => <E1, E2>(fa: Result<E1, A>, fb: Result<E2, B>) => Result<E1 | E2, C> = /*#__PURE__*/ apply.lift2(Apply)

/**
 * Lifts a ternary function into `Result`.
 *
 * @category lifting
 * @since 3.0.0
 */
export const lift3: <A, B, C, D>(
  f: (a: A, b: B, c: C) => D
) => <E1, E2, E3>(fa: Result<E1, A>, fb: Result<E2, B>, fc: Result<E3, C>) => Result<E1 | E2 | E3, D> =
  /*#__PURE__*/ apply.lift3(Apply)

/**
 * @category instances
 * @since 3.0.0
 */
export const Applicative: applicative.Applicative<ResultTypeLambda> = {
  map,
  ap,
  of
}

/**
 * The default [`Applicative`](#applicative) instance returns the first error, if you want to
 * get all errors you need to provide a way to combine them via a `Semigroup`.
 *
 * @example
 * import * as A from 'fp-ts/Apply'
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 * import * as S from 'fp-ts/Semigroup'
 * import * as string from 'fp-ts/string'
 *
 * const parseString = (u: unknown): E.Result<string, string> =>
 *   typeof u === 'string' ? E.of(u) : E.fail('not a string')
 *
 * const parseNumber = (u: unknown): E.Result<string, number> =>
 *   typeof u === 'number' ? E.of(u) : E.fail('not a number')
 *
 * interface Person {
 *   readonly name: string
 *   readonly age: number
 * }
 *
 * const parsePerson = (
 *   input: Record<string, unknown>
 * ): E.Result<string, Person> =>
 *   pipe(
 *     E.Do,
 *     E.bindRight('name', parseString(input.name)),
 *     E.bindRight('age', parseNumber(input.age))
 *   )
 *
 * assert.deepStrictEqual(parsePerson({}), E.fail('not a string')) // <= first error
 *
 * const Applicative = E.getValidatedApplicative(
 *   pipe(string.Semigroup, S.intercalate(', '))
 * )
 *
 * const bindRight = A.bindRight(Applicative)
 *
 * const parsePersonAll = (
 *   input: Record<string, unknown>
 * ): E.Result<string, Person> =>
 *   pipe(
 *     E.Do,
 *     bindRight('name', parseString(input.name)),
 *     bindRight('age', parseNumber(input.age))
 *   )
 *
 * assert.deepStrictEqual(parsePersonAll({}), E.fail('not a string, not a number')) // <= all errors
 *
 * @category error handling
 * @since 3.0.0
 */
export const getValidatedApplicative = <E>(
  Semigroup: Semigroup<E>
): applicative.Applicative<ValidatedT<ResultTypeLambda, E>> => ({
  map,
  ap: (fa) => (fab) =>
    isFailure(fab)
      ? isFailure(fa)
        ? fail(Semigroup.combine(fa.failure)(fab.failure))
        : fab
      : isFailure(fa)
      ? fa
      : of(fab.success(fa.success)),
  of
})

/**
 * @category instances
 * @since 3.0.0
 */
export const Monad: monad.Monad<ResultTypeLambda> = {
  map,
  of,
  flatMap
}

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @category error handling
 * @since 3.0.0
 */
export const tapError: <E1, E2>(
  onError: (e: E1) => Result<E2, unknown>
) => <A>(self: Result<E1, A>) => Result<E1 | E2, A> = (onError) => (self) => {
  if (isSuccess(self)) {
    return self
  }
  const out = onError(self.failure)
  return isFailure(out) ? out : self
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @since 3.0.0
 */
export const tap: <A, E2>(f: (a: A) => Result<E2, unknown>) => <E1>(self: Result<E1, A>) => Result<E1 | E2, A> =
  /*#__PURE__*/ flattenable.tap(Flattenable)

/**
 * @category instances
 * @since 3.0.0
 */
export const FlattenableRec: flattenableRec.FlattenableRec<ResultTypeLambda> = {
  flatMapRec: flatMapRec
}

/**
 * @category conversions
 * @since 3.0.0
 */
export const toIterable: <E, A>(self: Result<E, A>) => Iterable<A> = match(() => iterable.empty, iterable.of)

/**
 * @category instances
 * @since 3.0.0
 */
export const Foldable: foldable.Foldable<ResultTypeLambda> = {
  toIterable
}

/**
 * @category folding
 * @since 3.0.0
 */
export const reduce: <B, A>(b: B, f: (b: B, a: A) => B) => <E>(self: Result<E, A>) => B =
  /*#__PURE__*/ foldable.reduce(Foldable)

/**
 * @category folding
 * @since 3.0.0
 */
export const foldMap: <M>(Monoid: Monoid<M>) => <A>(f: (a: A) => M) => <E>(self: Result<E, A>) => M =
  /*#__PURE__*/ foldable.foldMap(Foldable)

/**
 * @category folding
 * @since 3.0.0
 */
export const reduceRight: <B, A>(b: B, f: (a: A, b: B) => B) => <E>(self: Result<E, A>) => B =
  /*#__PURE__*/ foldable.reduceRight(Foldable)

/**
 * @category instances
 * @since 3.0.0
 */
export const Traversable: traversable.Traversable<ResultTypeLambda> = {
  traverse
}

/**
 * @category traversing
 * @since 3.0.0
 */
export const sequence: <F extends TypeLambda>(
  F: applicative.Applicative<F>
) => <E, FS, FR, FO, FE, A>(fa: Result<E, Kind<F, FS, FR, FO, FE, A>>) => Kind<F, FS, FR, FO, FE, Result<E, A>> =
  /*#__PURE__*/ traversable.sequence(Traversable)

/**
 * @category instances
 * @since 3.0.0
 */
export const Alt: alt.Alt<ResultTypeLambda> = {
  orElse
}

/**
 * The default [`Alt`](#semigroupkind) instance returns the last error, if you want to
 * get all errors you need to provide a way to combine them via a `Semigroup`.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 * import * as S from 'fp-ts/Semigroup'
 * import * as string from 'fp-ts/string'
 *
 * const parseString = (u: unknown): E.Result<string, string> =>
 *   typeof u === 'string' ? E.of(u) : E.fail('not a string')
 *
 * const parseNumber = (u: unknown): E.Result<string, number> =>
 *   typeof u === 'number' ? E.of(u) : E.fail('not a number')
 *
 * const parse = (u: unknown): E.Result<string, string | number> =>
 *   pipe(
 *     parseString(u),
 *     E.orElse<string, string | number>(parseNumber(u))
 *   )
 *
 * assert.deepStrictEqual(parse(true), E.fail('not a number')) // <= last error
 *
 * const Alt = E.getValidatedAlt(pipe(string.Semigroup, S.intercalate(', ')))
 *
 * const parseAll = (u: unknown): E.Result<string, string | number> =>
 *   pipe(parseString(u), Alt.orElse(parseNumber(u) as E.Result<string, string | number>))
 *
 * assert.deepStrictEqual(parseAll(true), E.fail('not a string, not a number')) // <= all errors
 *
 * @category error handling
 * @since 3.0.0
 */
export const getValidatedAlt = <E>(Semigroup: Semigroup<E>): alt.Alt<ValidatedT<ResultTypeLambda, E>> => ({
  orElse: (that) => (self) => {
    if (isSuccess(self)) {
      return self
    }
    return isFailure(that) ? fail(Semigroup.combine(that.failure)(self.failure)) : that
  }
})

/**
 * @category instances
 * @since 3.0.0
 */
export const Extendable: extendable.Extendable<ResultTypeLambda> = {
  map,
  extend
}

/**
 * @category instances
 * @since 3.0.0
 */
export const FromResult: fromResult_.FromResult<ResultTypeLambda> = {
  fromResult: identity
}

/**
 * @example
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 * import * as O from 'fp-ts/Option'
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     O.some(1),
 *     E.fromOption('error')
 *   ),
 *   E.of(1)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     O.none,
 *     E.fromOption('error')
 *   ),
 *   E.fail('error')
 * )
 *
 * @category conversions
 * @since 3.0.0
 */
export const fromOption: <E>(onNone: E) => <A>(fa: Option<A>) => Result<E, A> = _.fromOption

/**
 * @category conversions
 * @since 3.0.0
 */
export const toOption: <A>(self: Result<unknown, A>) => Option<A> = _.getSuccess

/**
 * @category conversions
 * @since 3.0.0
 */
export const toNull: <A>(self: Result<unknown, A>) => A | null = /*#__PURE__*/ getOrElse(null)

/**
 * @category conversions
 * @since 3.0.0
 */
export const toUndefined: <A>(self: Result<unknown, A>) => A | undefined = /*#__PURE__*/ getOrElse(undefined)

/**
 * @example
 * import { liftPredicate, fail, of } from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     1,
 *     liftPredicate((n) => n > 0, 'error')
 *   ),
 *   of(1)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     -1,
 *     liftPredicate((n) => n > 0, 'error')
 *   ),
 *   fail('error')
 * )
 *
 * @category lifting
 * @since 3.0.0
 */
export const liftPredicate: {
  <C extends A, B extends A, E, A = C>(refinement: Refinement<A, B>, onFalse: E): (c: C) => Result<E, B>
  <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (b: B) => Result<E, B>
} = /*#__PURE__*/ fromResult_.liftPredicate(FromResult)

/**
 * @category lifting
 * @since 3.0.0
 */
export const liftOption: <A extends ReadonlyArray<unknown>, B, E>(
  f: (...a: A) => Option<B>,
  onNone: E
) => (...a: A) => Result<E, B> = /*#__PURE__*/ fromResult_.liftOption(FromResult)

/**
 * @example
 * import * as E from 'fp-ts/Result'
 * import { pipe } from 'fp-ts/Function'
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     E.of(1),
 *     E.filter((n) => n > 0, 'error')
 *   ),
 *   E.of(1)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.of(-1),
 *     E.filter((n) => n > 0, 'error')
 *   ),
 *   E.fail('error')
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.fail('a'),
 *     E.filter((n) => n > 0, 'error')
 *   ),
 *   E.fail('a')
 * )
 *
 * @category filtering
 * @since 3.0.0
 */
export const filter: {
  <C extends A, B extends A, E2, A = C>(refinement: Refinement<A, B>, onFalse: E2): <E1>(
    self: Result<E1, C>
  ) => Result<E2 | E1, B>
  <B extends A, E2, A = B>(predicate: Predicate<A>, onFalse: E2): <E1>(self: Result<E1, B>) => Result<E2 | E1, B>
} = /*#__PURE__*/ fromResult_.filter(FromResult, Flattenable)

/**
 * @category filtering
 * @since 3.0.0
 */
export const filterMap: <A, B, E>(f: (a: A) => Option<B>, onNone: E) => (self: Result<E, A>) => Result<E, B> =
  /*#__PURE__*/ fromResult_.filterMap(FromResult, Flattenable)

/**
 * @category filtering
 * @since 3.0.0
 */
export const partition: {
  <C extends A, B extends A, E, A = C>(refinement: Refinement<A, B>, onFalse: E): (
    self: Result<E, C>
  ) => readonly [Result<E, C>, Result<E, B>]
  <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (
    self: Result<E, B>
  ) => readonly [Result<E, B>, Result<E, B>]
} = /*#__PURE__*/ fromResult_.partition(FromResult, Flattenable)

/**
 * @category filtering
 * @since 3.0.0
 */
export const partitionMap: <A, B, C, E>(
  f: (a: A) => Result<B, C>,
  onEmpty: E
) => (self: Result<E, A>) => readonly [Result<E, B>, Result<E, C>] = /*#__PURE__*/ fromResult_.partitionMap(
  FromResult,
  Flattenable
)

/**
 * @category sequencing
 * @since 3.0.0
 */
export const flatMapOption: <A, B, E2>(
  f: (a: A) => Option<B>,
  onNone: E2
) => <E1>(self: Result<E1, A>) => Result<E2 | E1, B> = /*#__PURE__*/ fromResult_.flatMapOption(FromResult, Flattenable)

/**
 * Tests whether a value is a member of a `Result`.
 *
 * @since 3.0.0
 */
export const elem =
  <A>(E: eq.Eq<A>) =>
  (a: A) =>
  <E>(ma: Result<E, A>): boolean =>
    isFailure(ma) ? false : E.equals(ma.success)(a)

/**
 * Returns `false` if `Failure` or returns the result of the application of the given predicate to the `Success` value.
 *
 * @example
 * import * as E from 'fp-ts/Result'
 *
 * const f = E.exists((n: number) => n > 2)
 *
 * assert.strictEqual(f(E.fail('a')), false)
 * assert.strictEqual(f(E.of(1)), false)
 * assert.strictEqual(f(E.of(3)), true)
 *
 * @since 3.0.0
 */
export const exists =
  <A>(predicate: Predicate<A>) =>
  (ma: Result<unknown, A>): boolean =>
    isFailure(ma) ? false : predicate(ma.success)

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @category do notation
 * @since 3.0.0
 */
export const Do: Result<never, {}> = /*#__PURE__*/ of(_.emptyReadonlyRecord)

/**
 * @category do notation
 * @since 3.0.0
 */
export const bindTo: <N extends string>(name: N) => <E, A>(self: Result<E, A>) => Result<E, { readonly [K in N]: A }> =
  /*#__PURE__*/ functor.bindTo(Functor)

const let_: <N extends string, A extends object, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => B
) => <E>(self: Result<E, A>) => Result<E, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }> =
  /*#__PURE__*/ functor.let(Functor)

export {
  /**
   * @category do notation
   * @since 3.0.0
   */
  let_ as let
}

/**
 * @category do notation
 * @since 3.0.0
 */
export const bind: <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => Result<E2, B>
) => <E1>(self: Result<E1, A>) => Result<E1 | E2, { readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }> =
  /*#__PURE__*/ flattenable.bind(Flattenable)

/**
 * A variant of `bind` that sequentially ignores the scope.
 *
 * @category do notation
 * @since 3.0.0
 */
export const bindRight: <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  fb: Result<E2, B>
) => <E1>(self: Result<E1, A>) => Result<E1 | E2, { readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }> =
  /*#__PURE__*/ apply.bindRight(Apply)

// -------------------------------------------------------------------------------------
// tuple sequencing
// -------------------------------------------------------------------------------------

/**
 * @category tuple sequencing
 * @since 3.0.0
 */
export const Zip: Result<never, readonly []> = /*#__PURE__*/ of(_.emptyReadonlyArray)

/**
 * @category tuple sequencing
 * @since 3.0.0
 */
export const tupled: <E, A>(self: Result<E, A>) => Result<E, readonly [A]> = /*#__PURE__*/ functor.tupled(Functor)

/**
 * Sequentially zips this effect with the specified effect.
 *
 * @category tuple sequencing
 * @since 3.0.0
 */
export const zipFlatten: <E2, B>(
  fb: Result<E2, B>
) => <E1, A extends ReadonlyArray<unknown>>(self: Result<E1, A>) => Result<E1 | E2, readonly [...A, B]> =
  /*#__PURE__*/ apply.zipFlatten(Apply)

/**
 * Sequentially zips this effect with the specified effect using the specified combiner function.
 *
 * @category tuple sequencing
 * @since 3.0.0
 */
export const zipWith: <E2, B, A, C>(
  that: Result<E2, B>,
  f: (a: A, b: B) => C
) => <E1>(self: Result<E1, A>) => Result<E2 | E1, C> = /*#__PURE__*/ apply.zipWith(Apply)

// -------------------------------------------------------------------------------------
// array utils
// -------------------------------------------------------------------------------------

/**
 * Equivalent to `NonEmptyReadonlyArray#traverseWithIndex(Apply)`.
 *
 * @category traversing
 * @since 3.0.0
 */
export const traverseNonEmptyReadonlyArrayWithIndex =
  <A, E, B>(f: (index: number, a: A) => Result<E, B>) =>
  (as: NonEmptyReadonlyArray<A>): Result<E, NonEmptyReadonlyArray<B>> => {
    const e = f(0, _.head(as))
    if (isFailure(e)) {
      return e
    }
    const out: _.NonEmptyArray<B> = [e.success]
    for (let i = 1; i < as.length; i++) {
      const e = f(i, as[i])
      if (isFailure(e)) {
        return e
      }
      out.push(e.success)
    }
    return of(out)
  }

/**
 * Equivalent to `ReadonlyArray#traverseWithIndex(Applicative)`.
 *
 * @category traversing
 * @since 3.0.0
 */
export const traverseReadonlyArrayWithIndex = <A, E, B>(
  f: (index: number, a: A) => Result<E, B>
): ((as: ReadonlyArray<A>) => Result<E, ReadonlyArray<B>>) => {
  const g = traverseNonEmptyReadonlyArrayWithIndex(f)
  return (as) => (_.isNonEmpty(as) ? g(as) : Zip)
}

/**
 * Equivalent to `NonEmptyReadonlyArray#traverse(Apply)`.
 *
 * @category traversing
 * @since 3.0.0
 */
export const traverseNonEmptyReadonlyArray = <A, E, B>(
  f: (a: A) => Result<E, B>
): ((as: NonEmptyReadonlyArray<A>) => Result<E, NonEmptyReadonlyArray<B>>) => {
  return traverseNonEmptyReadonlyArrayWithIndex(flow(SK, f))
}

/**
 * Equivalent to `ReadonlyArray#traverse(Applicative)`.
 *
 * @category traversing
 * @since 3.0.0
 */
export const traverseReadonlyArray = <A, E, B>(
  f: (a: A) => Result<E, B>
): ((as: ReadonlyArray<A>) => Result<E, ReadonlyArray<B>>) => {
  return traverseReadonlyArrayWithIndex(flow(SK, f))
}

/**
 * Equivalent to `ReadonlyArray#sequence(Applicative)`.
 *
 * @category traversing
 * @since 3.0.0
 */
export const sequenceReadonlyArray: <E, A>(arr: ReadonlyArray<Result<E, A>>) => Result<E, ReadonlyArray<A>> =
  /*#__PURE__*/ traverseReadonlyArray(identity)