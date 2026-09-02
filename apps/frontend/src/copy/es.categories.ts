/**
 * The Spanish category nouns.
 *
 * Nouns only — no `intro`, no `faq`. `categoryCopy` falls back field by field,
 * so these 78 strings put Spanish in every title, heading, link and chip on the
 * page while the prose underneath stays English. That is a shippable state and
 * the one Finnish has been in since August, not a half-finished one.
 *
 * `plural` and `singular` are the bare citation form, because the templates
 * decide the slot. Do not put a case- or gender-inflected form here.
 *
 * Every noun in the live categories was chosen from `npm run copy:nouns`
 * rather than from a dictionary: the question search asks is not what the
 * thing is called but what people type. "punto limpio" completes to Madrid, Sevilla, Zaragoza and Valladolid —
 * city after city, which is what a noun with local search demand looks like.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import type { CategoryCopy } from "./types";

const nouns: Record<string, Partial<CategoryCopy>> = {
  "toilets": { plural: "baños públicos", singular: "baño público", heading: "Baños públicos" },
  "drinking-water": { plural: "fuentes de agua potable", singular: "fuente de agua potable", heading: "Agua potable" },
  "playgrounds": { plural: "parques infantiles", singular: "parque infantil", heading: "Parques infantiles" },
  "parking": { plural: "aparcamientos", singular: "aparcamiento", heading: "Aparcamientos" },
  "charging-stations": { plural: "puntos de recarga", singular: "punto de recarga", heading: "Puntos de recarga" },
  "gas-stations": { plural: "gasolineras", singular: "gasolinera", heading: "Gasolineras" },
  "ice-cream": { plural: "heladerías", singular: "heladería", heading: "Heladerías" },
  "dog-parks": { plural: "parques para perros", singular: "parque para perros", heading: "Parques para perros" },
  "picnic-spots": { plural: "áreas de picnic", singular: "área de picnic", heading: "Áreas de picnic" },
  "viewpoints": { plural: "miradores", singular: "mirador", heading: "Miradores" },
  "beaches": { plural: "playas", singular: "playa", heading: "Playas y baño" },
  "atms": { plural: "cajeros automáticos", singular: "cajero automático", heading: "Cajeros automáticos" },
  "post-boxes": { plural: "buzones de correos", singular: "buzón de correos", heading: "Buzones de correos" },
  "recycling": { plural: "puntos limpios", singular: "punto limpio", heading: "Puntos limpios" },
  "luggage-storage": { plural: "consignas de equipaje", singular: "consigna de equipaje", heading: "Consignas de equipaje" },
  "libraries": { plural: "bibliotecas", singular: "biblioteca", heading: "Bibliotecas" },
  "outdoor-gyms": { plural: "gimnasios al aire libre", singular: "gimnasio al aire libre", heading: "Gimnasios al aire libre" },
  "camp-sites": { plural: "campings", singular: "camping", heading: "Campings" },
  "shelters": { plural: "refugios", singular: "refugio", heading: "Refugios" },
  "rest-areas": { plural: "áreas de descanso", singular: "área de descanso", heading: "Áreas de descanso" },
  "dump-stations": { plural: "áreas de autocaravanas", singular: "área de autocaravanas", heading: "Áreas de autocaravanas" },
  "post-offices": { plural: "oficinas de correos", singular: "oficina de correos", heading: "Oficinas de correos" },
  "showers": { plural: "duchas públicas", singular: "ducha pública", heading: "Duchas públicas" },
  "fireplaces": { plural: "zonas de barbacoa", singular: "zona de barbacoa", heading: "Zonas de barbacoa" },
  "bicycle-repair": { plural: "talleres de bicicletas", singular: "taller de bicicletas", heading: "Talleres de bicicletas" },
  "benches": { plural: "bancos públicos", singular: "banco público", heading: "Bancos públicos" },
};

export const esCategories: Record<string, Partial<CategoryCopy>> = nouns;
