"use client";

import { useEffect } from "react";
import { onRouteChange, setSynthParam, synthParamOpen } from "@/lib/appRoute";
import { useIntroStore, useUIStore } from "@/lib/store";

/** `?synth` <-> panel open. The first read waits for the intro's headline cue. */
export function useSynthDeepLink() {
  useEffect(() => {
    const sync = () => useUIStore.getState().setSynthPanel(synthParamOpen());

    let unsubIntro = () => {};
    if (useIntroStore.getState().headlinePlay) sync();
    else
      unsubIntro = useIntroStore.subscribe((s) => {
        if (!s.headlinePlay) return;
        unsubIntro();
        sync();
      });

    const unsubRoute = onRouteChange(sync);
    const unsubStore = useUIStore.subscribe((s) => setSynthParam(s.synthPanelOpen));
    return () => {
      unsubIntro();
      unsubRoute();
      unsubStore();
    };
  }, []);
}
