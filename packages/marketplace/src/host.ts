/**
 * dsh-host-marketplace entry: registers the marketplace gateway as a Cordis
 * plugin row. One row (`name: '@dsh-marketplace/marketplace'`) activates both
 * the Host service and, via exports["./client"], the browser marketplace tab.
 */
import { MarketplaceGateway, type MarketplaceConfig } from "./gateway";

export const name = "marketplace";
export const inject = [] as string[];

export function apply(ctx: any, config: MarketplaceConfig = {}) {
  ctx.plugin(MarketplaceGateway, config);
}
