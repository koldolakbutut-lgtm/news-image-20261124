# news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/koldolakbutut-lgtm/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/koldolakbutut-lgtm/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

A program that draws one image summing up the world news of Tuesday 24 November 2026: a newspaper front page. The COP31 climate talks collapse in Antalya (90+ nations reject a draft with no fossil-fuel wording); Ukraine's naval drones sink a Russian warship off Benghazi, Libya; Russia tests NATO's Article 5 with a surge of airspace violations; the US-Iran naval blockade standoff in the Gulf; Israeli strikes in Gaza kill a Hamas security chief — plus Nvidia, the DRC and Zaporizhzhia in the footer ticker. Drawn from scratch in pure TypeScript (standard library only, no network, no fonts on disk — a built-in 5x7 bitmap font), so the output is byte-identical on every run.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024 PNG).

---

<sub>Entered on [make.fun](https://make.fun/?ref=t93zsgs2&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>
