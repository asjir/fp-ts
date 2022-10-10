/**
 * TODO: description
 *
 * `Alternative` instances should satisfy the following laws in addition to the `Alt` laws:
 *
 * 1. Left identity: `none |> orElse(fa) <-> fa`
 * 2. Right identity: `fa |> orElse(none) <-> fa`
 * 3. Annihilation1: `none |> map(f) <-> none`
 * 4. Distributivity: `fab |> orElse(gab) |> ap(fa) <-> fab |> ap(fa) |> orElse(gab |> A.ap(fa))`
 * 5. Annihilation2: `none |> ap(fa) <-> none`
 *
 * @since 3.0.0
 */
import type { Alt } from './Alt'
import * as alt from './Alt'
import type { FromIdentity } from './FromIdentity'
import type { Kind, TypeLambda } from './HKT'

/**
 * @category model
 * @since 3.0.0
 */
export interface Alternative<F extends TypeLambda> extends Alt<F> {
  readonly none: <S>() => Kind<F, S, unknown, never, never, never>
}

/**
 * @category do notation
 * @since 3.0.0
 */
export const guard =
  <F extends TypeLambda>(Alternative: Alternative<F>, FromIdentity: FromIdentity<F>) =>
  <S>(b: boolean): Kind<F, S, unknown, never, never, void> =>
    b ? FromIdentity.of(undefined) : Alternative.none()

/**
 * Returns an effect that runs each of the specified effects in order until one of them succeeds.
 *
 * @since 3.0.0
 */
export const firstSuccessOf =
  <G extends TypeLambda>(Alternative: Alternative<G>) =>
  <S, R, O, E, A>(collection: Iterable<Kind<G, S, R, O, E, A>>): Kind<G, S, R, O, E, A> =>
    alt.firstSuccessOf(Alternative)<S, R, O, E, A>(Alternative.none())(collection)
