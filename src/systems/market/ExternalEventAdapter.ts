import { MarketSignal } from "../../types/domain";
import { ExternalMarketEvent } from "../../types/externalEvent";

export function toMarketSignal(event: ExternalMarketEvent): MarketSignal {
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? event.title,
    day: event.day,
    duration: event.duration,
    sectorImpacts: event.sectorImpacts,
    inflationImpact: event.inflationImpact,
    heatImpact: event.heatImpact
  };
}
