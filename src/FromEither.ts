/**
 * The `FromEither` type class represents those data types which support errors.
 *
 * @since 3.0.0
 */
import * as ChainModule from './Chain'
import type { Either } from './Either'
import { Lazy, pipe } from './function'
import type { HKT, Kind, Typeclass } from './HKT'
import * as _ from './internal'
import type { Option } from './Option'
import type { Predicate } from './Predicate'
import type { Refinement } from './Refinement'

import Chain = ChainModule.Chain

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category type classes
 * @since 3.0.0
 */
export interface FromEither<F extends HKT> extends Typeclass<F> {
  readonly fromEither: <E, A, S, R = unknown, W = never>(fa: Either<E, A>) => Kind<F, S, R, W, E, A>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 3.0.0
 */
export const fromOption = <F extends HKT>(F: FromEither<F>) => <E>(
  onNone: Lazy<E>
): (<A, S, R = unknown, W = never>(fa: Option<A>) => Kind<F, S, R, W, E, A>) => {
  const fromOption = _.fromOption(onNone)
  return (ma) => F.fromEither(fromOption(ma))
}

/**
 * @category constructors
 * @since 3.0.0
 */
export const fromPredicate = <F extends HKT>(F: FromEither<F>) => <B extends A, A = B>(predicate: Predicate<A>) => <
  S,
  R = unknown,
  W = never
>(
  b: B
): Kind<F, S, R, W, B, B> => F.fromEither(predicate(b) ? _.right(b) : _.left(b))

/**
 * @category constructors
 * @since 3.0.0
 */
export const fromPredicateOrElse = <F extends HKT>(F: FromEither<F>) => <B extends A, E, A = B>(
  predicate: Predicate<A>,
  onFalse: (b: B) => E
) => <S, R = unknown, W = never>(b: B): Kind<F, S, R, W, E, B> =>
  F.fromEither(predicate(b) ? _.right(b) : _.left(onFalse(b)))

/**
 * @category constructors
 * @since 3.0.0
 */
export const fromRefinement = <F extends HKT>(F: FromEither<F>) => <C extends A, B extends A, A = C>(
  refinement: Refinement<A, B>
) => <S, R = unknown, W = never>(c: C): Kind<F, S, R, W, C, B> => F.fromEither(refinement(c) ? _.right(c) : _.left(c))

/**
 * @category constructors
 * @since 3.0.0
 */
export const fromRefinementOrElse = <F extends HKT>(F: FromEither<F>) => <C extends A, B extends A, E, A = C>(
  refinement: Refinement<A, B>,
  onFalse: (c: C) => E
) => <S, R = unknown, W = never>(c: C): Kind<F, S, R, W, E, B> =>
  F.fromEither(refinement(c) ? _.right(c) : _.left(onFalse(c)))

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 3.0.0
 */
export const fromOptionK = <F extends HKT>(
  F: FromEither<F>
): (<E>(
  onNone: Lazy<E>
) => <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Option<B>
) => <S, R = unknown, W = never>(...a: A) => Kind<F, S, R, W, E, B>) => {
  const fromOptionF = fromOption(F)
  return (onNone) => {
    const from = fromOptionF(onNone)
    return (f) => (...a) => from(f(...a))
  }
}

/**
 * @category combinators
 * @since 3.0.0
 */
export const chainOptionK = <M extends HKT>(
  F: FromEither<M>,
  M: Chain<M>
): (<E>(
  onNone: Lazy<E>
) => <A, B>(f: (a: A) => Option<B>) => <S, R, W>(ma: Kind<M, S, R, W, E, A>) => Kind<M, S, R, W, E, B>) => {
  const fromOptionKF = fromOptionK(F)
  return <E>(onNone: Lazy<E>) => {
    const from = fromOptionKF(onNone)
    return <A, B>(f: (a: A) => Option<B>) => <S, R, W>(ma: Kind<M, S, R, W, E, A>) =>
      pipe(ma, M.chain<A, S, R, W, E, B>(from(f)))
  }
}

/**
 * @category combinators
 * @since 3.0.0
 */
export const fromEitherK = <F extends HKT>(F: FromEither<F>) => <A extends ReadonlyArray<unknown>, E, B>(
  f: (...a: A) => Either<E, B>
) => <S, R = unknown, W = never>(...a: A): Kind<F, S, R, W, E, B> => F.fromEither(f(...a))

/**
 * @category combinators
 * @since 3.0.0
 */
export const chainEitherK = <M extends HKT>(F: FromEither<M>, M: Chain<M>) => {
  const fromEitherKF = fromEitherK(F)
  return <A, E2, B>(f: (a: A) => Either<E2, B>) => <S, R, W, E1>(
    ma: Kind<M, S, R, W, E1, A>
  ): Kind<M, S, R, W, E1 | E2, B> => {
    return pipe(ma, M.chain<A, S, R, W, E1 | E2, B>(fromEitherKF(f)))
  }
}

/**
 * @category combinators
 * @since 3.0.0
 */
export const chainFirstEitherK = <M extends HKT>(
  F: FromEither<M>,
  M: Chain<M>
): (<A, E2, B>(
  f: (a: A) => Either<E2, B>
) => <S, R, W, E1>(ma: Kind<M, S, R, W, E1, A>) => Kind<M, S, R, W, E1 | E2, A>) => {
  const chainFirstM = ChainModule.chainFirst(M)
  const fromEitherKF = fromEitherK(F)
  return (f) => {
    const fromEitherKFf = fromEitherKF(f)
    return chainFirstM((a) => fromEitherKFf(a))
  }
}

/**
 * @category combinators
 * @since 3.0.0
 */
export const filterOrElse = <M extends HKT>(F: FromEither<M>, M: Chain<M>) => <B extends A, E2, A = B>(
  predicate: Predicate<A>,
  onFalse: (b: B) => E2
): (<S, R, W, E1>(mb: Kind<M, S, R, W, E1, B>) => Kind<M, S, R, W, E1 | E2, B>) => {
  return M.chain((b) => F.fromEither(predicate(b) ? _.right(b) : _.left(onFalse(b))))
}

/**
 * @category combinators
 * @since 3.0.0
 */
export const refineOrElse = <M extends HKT>(F: FromEither<M>, M: Chain<M>) => <C extends A, B extends A, E2, A = C>(
  refinement: Refinement<A, B>,
  onFalse: (c: C) => E2
): (<S, R, W, E1>(ma: Kind<M, S, R, W, E1, C>) => Kind<M, S, R, W, E1 | E2, B>) => {
  return M.chain((c) => F.fromEither(refinement(c) ? _.right(c) : _.left(onFalse(c))))
}
