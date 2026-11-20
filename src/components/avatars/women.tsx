// Dalilak avatars av-05..av-08: the four WOMEN.
//
// The cast (who they are · what makes the silhouette theirs at 32 px):
//  av-05 · a classic wrapped hijab in the brand's blue: a round dome that settles wide over the shoulders. Round face,
//          a calm closed smile.
//  av-06 · a black shayla with one long end drawn diagonally across the chest: an asymmetric bell, tight on one side and
//          falling wide on the other. Rectangular glasses, a slight open smile.
//  av-07 · a cream hijab in the Gulf style: a raised crown at the back, a black underscarf band across the forehead, and a
//          drape that crosses the chest. On a light ground, so she is never confused with the white ghutra of av-10.
//  av-08 · no hijab: long dark hair with a centre part, one side tucked behind her ear, head tilted, a laugh, a small
//          metal earring. Hair is the silhouette.
// Each wears the waypoint as the chest pin (parts.tsx PIN); on av-06 and av-07 it is the pin that holds the drape.
import { cloth, grounds, hair, marks, mix, skin, tok } from "./palette";
import { BODY, Brows, Cheeks, Eyes, Fold, MouthOpen, Neck, Nose, Pin, Smile, Tilt, headPath, type Figure } from "./parts";

/** av-05 · classic wrapped hijab. */
export const av05: Figure = {
  ground: grounds.ice,
  trail: { r: 30, m: 36, l: 40, sway: 4 },
  draw() {
    const s = skin.s1;
    const fold = mix(tok.stage3, 60, marks.white);
    return (
      <>
        <path d={BODY} fill={cloth.black.base} />
        <path d="M48 13C31 13 21.6 25.6 21.6 43C21.6 56.6 18 65.4 12.2 73.4C20 87.6 33 97.6 48 97.6C63 97.6 76 87.6 83.8 73.4C78 65.4 74.4 56.6 74.4 43C74.4 25.6 65 13 48 13Z" fill={tok.stage3} />
        <Fold color={fold} d="M31.4 52C32 63.6 39 71.6 48 71.6C57 71.6 64 63.6 64.6 52M22.6 76.4C30 84 38.4 88 47.4 88.8M30.2 27.4C34.4 21 40.8 17.6 48 17.6M70.2 53C71 60.6 73.4 66.8 77.4 71.6" />
        <path d={headPath(48, 31, 48.6, 68.4, 13.6, 10)} fill={s.base} />
        {/* the hijab's front edge over the forehead */}
        <path d="M34 40.6C35.2 33.4 41 29 48 29C55 29 60.8 33.4 62 40.6C58.2 36.2 53.4 34 48 34C42.6 34 37.8 36.2 34 40.6Z" fill={tok.stage3} />
        <Cheeks gap={9.4} skin={s} y={55} />
        <Brows color={hair.espresso.base} gap={6.6} kind="soft" width={1.8} y={42.8} />
        <Eyes gap={6.6} kind="oval" y={48.8} />
        <Nose kind="button" size={0.9} skin={s} y={51.2} />
        <Smile depth={3} skin={s} thick={1.6} w={4.4} y={57.6} />
        <Pin />
      </>
    );
  },
};

/** av-06 · black shayla with a diagonal drape, glasses. */
export const av06: Figure = {
  ground: grounds.dusk,
  trail: { r: 34, m: 40, l: 45, sway: 4 },
  draw() {
    const s = skin.s3;
    const c = cloth.black;
    return (
      <>
        <path d="M48 14.4C34.4 14.4 27 24.6 26.6 38.6C26.2 50 24.6 57.6 19 65C13.6 72 9.6 80.4 7.6 98L89 98C87.6 86.6 82.4 78.6 75.2 72.6C70.4 66.4 69.6 52.6 69.4 39.6C69.2 24.6 61.6 14.4 48 14.4Z" fill={c.base} />
        <Fold color={c.fold} d="M31 26.6C34.6 20.6 40.6 17.6 47 17.4M30.6 52.4C31.2 63.6 38.4 71.4 48 71.4C57.6 71.4 64.6 63.6 65.4 52.4M71.2 58C72 64.6 74.6 69.6 79.2 73.6" />
        {/* the long end crossing the chest, held by the pin */}
        <path d="M27.2 58C30.8 72 46 81 75.6 76.4L82.6 84.6C60 92.6 36.4 88 22.6 72Z" fill={c.base} />
        <Fold color={c.fold} d="M29.2 61.4C34.4 72.6 50 79.4 74.6 77.2M24.6 71C32.6 80.6 44 85.4 53.6 86.2" />
        <path d={headPath(48, 31, 48.8, 68.6, 13.4, 9.6)} fill={s.base} />
        <path d="M34 41C35.2 33.6 41 29.2 48 29.2C55 29.2 60.8 33.6 62 41C58.4 36.6 53.6 34.4 48 34.4C42.4 34.4 37.6 36.6 34 41Z" fill={c.base} />
        <Fold color={cloth.cream.base} d="M35.8 39.4C38 35.8 42.6 33.6 48 33.6C53.4 33.6 58 35.8 60.2 39.4" width={1.5} />
        <Cheeks gap={9.6} skin={s} y={56} />
        <Brows color={hair.black.base} gap={7.2} kind="soft" y={42.6} />
        <Eyes gap={7.2} kind="dot" scale={0.9} y={49} />
        <g fill="none" stroke={tok.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
          <rect height={8} rx={2.8} width={10.4} x={35.6} y={45} />
          <rect height={8} rx={2.8} width={10.4} x={50} y={45} />
          <path d="M46 48Q48 46.6 50 48M35.6 47.6L33.8 46.8M60.4 47.6L62.2 46.8" />
        </g>
        <Nose size={0.9} skin={s} y={52.4} />
        <MouthOpen h={3} teeth={false} w={3.8} y={58.6} />
        <Pin />
      </>
    );
  },
};

/** av-07 · cream hijab in the Gulf style. */
export const av07: Figure = {
  ground: grounds.sky,
  trail: { r: 38, m: 44, l: 50, sway: 4 },
  draw() {
    const s = skin.s4;
    const c = cloth.cream;
    return (
      <>
        <path d={BODY} fill={cloth.black.base} />
        <path d="M50.4 10C63 10 70.8 17.6 71 29C71.2 34.6 72.6 40.6 74 47C75.6 56.6 79 66 85.4 73.6C78.4 87.6 65.4 97.6 48 97.6C30.6 97.6 17.4 87.6 10.6 73.6C17 66 20.4 57.4 21.8 48C23 39 24.6 33 28.2 27C29.8 16.8 38.8 10 50.4 10Z" fill={c.base} />
        <Fold color={c.fold} d="M30.6 27C36 22.4 43 20.4 50.4 20.6C57.6 20.8 63.4 23.2 67.6 27.4M31.6 54C32.2 64.6 39 71.4 48 71.4C57 71.4 63.8 64.6 64.4 54M68.6 56C70.4 63 74 69 79 73" />
        <path d={headPath(48, 32, 49.4, 68.8, 13.8, 9)} fill={s.base} />
        {/* the black underscarf band, then the hijab's front edge above it */}
        <path d="M33.6 42.6C35 35.6 40.8 31.4 48 31.4C55.2 31.4 61 35.6 62.4 42.6C58.6 38.6 53.6 36.6 48 36.6C42.4 36.6 37.4 38.6 33.6 42.6Z" fill={cloth.black.base} />
        <path d="M31.6 40C33 32 39.6 27.4 48 27.4C56.4 27.4 63 32 64.4 40C60.6 35.6 54.8 32.8 48 32.8C41.2 32.8 35.4 35.6 31.6 40Z" fill={c.base} />
        {/* the drape that crosses the chest, held by the pin */}
        <path d="M14 76C26 84 44 86.4 70.4 79.4L77 86.2C56 95.6 30 94.6 16.4 86Z" fill={c.base} />
        <Fold color={c.fold} d="M14.6 77.6C26.4 85 44 87.6 69.8 80.8M18.6 83.6C30 89.4 44 90.8 54.6 89.6" />
        <Cheeks gap={9.2} skin={s} y={56} />
        <Brows color={hair.chestnut.base} gap={6.6} kind="soft" width={1.7} y={44.2} />
        <Eyes gap={6.6} kind="lash" y={50.2} />
        <Nose kind="button" size={0.88} skin={s} y={52.6} />
        <Smile depth={3} skin={s} w={4.2} y={58.8} />
        <Pin />
      </>
    );
  },
};

/** av-08 · long hair, no hijab. */
export const av08: Figure = {
  ground: grounds.ice,
  trail: { r: 34, m: 40, l: 46, sway: 4 },
  draw() {
    const s = skin.s2;
    const h = hair.espresso;
    return (
      <>
        <Tilt deg={-4} y={74}>
          <path d="M48 15C33.4 15 24.6 26.4 24.6 43.6C24.6 56.6 23.6 67 19.6 79.6L74 79.6C71.2 69.4 70 59.6 70.2 48C70.4 28.6 63.2 15 48 15Z" fill={h.base} />
        </Tilt>
        <Neck bottom={82} skin={s} top={62} w={10.6} x={42.7} />
        <path d="M4.5 98C6.5 84.6 17.6 78.6 33.4 77.6L39.6 77.6C41.8 82.4 54.2 82.4 56.4 77.6L62.6 77.6C78.4 78.6 89.5 84.6 91.5 98Z" fill={cloth.camel.base} />
        <Fold color={cloth.camel.fold} d="M14.6 93C17.6 87 23 83 29.8 81.2M81.4 93C78.4 87 73 83 66.2 81.2" />
        {/* the lock that falls over her shoulder */}
        <path d="M31.8 54C30.6 64.4 28.6 74.6 25 86C28.8 88.2 33.6 87.8 37 84.6C35.8 75.6 36 65.8 37 57Z" fill={h.base} />
        <Fold color={h.sheen} d="M33 62C32.2 70 30.6 77 28.4 83.4" width={1.4} />
        <Pin />
        <Tilt deg={-4} y={74}>
          <ellipse cx={62.8} cy={51.4} fill={s.shade} rx={2.8} ry={3.4} />
          <circle cx={63.2} cy={56.6} fill={marks.metal} r={1.4} />
          <path d={headPath(48, 29.4, 48.6, 68, 14, 10.4)} fill={s.base} />
          <path d="M48.4 23C40.4 23 34 28.6 32.8 39C32.2 44.2 32.4 49.8 33.2 55C34.4 47.8 36.4 41.2 40 36C42.8 32.2 45.6 29.8 48.4 28.4Z" fill={h.base} />
          <path d="M48.4 23C56.4 23 62.6 28.4 63.6 38C63.8 40.6 63.6 43.4 63 45.8C61.6 39.8 59 35.2 54.8 31.8C52.4 29.8 50.4 28.8 48.4 28.4Z" fill={h.base} />
          <Fold color={h.sheen} d="M37.4 34C35.4 38.8 34.6 44.2 34.8 50M57.2 30.6C60 33 61.8 36.2 62.6 39.8" width={1.4} />
          <Cheeks gap={9.6} skin={s} y={54.8} />
          <Brows color={h.base} gap={6.8} kind="soft" width={1.8} y={42.8} />
          <Eyes gap={6.8} kind="lash" y={48.8} />
          <Nose size={0.9} skin={s} y={51.2} />
          <MouthOpen h={4.4} w={5} y={57.2} />
        </Tilt>
      </>
    );
  },
};
