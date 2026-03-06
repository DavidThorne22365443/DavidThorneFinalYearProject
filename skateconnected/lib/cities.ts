// Irish cities for registration dropdown and map focus [lng, lat]
export const CITIES = [
    { id: "athlone", name: "Athlone", center: [-7.94, 53.42] as const },
    { id: "bray", name: "Bray", center: [-6.1, 53.2] as const },
    { id: "cavan", name: "Cavan", center: [-7.36, 53.99] as const },
    { id: "cork", name: "Cork", center: [-8.47, 51.9] as const },
    { id: "drogheda", name: "Drogheda", center: [-6.35, 53.72] as const },
    { id: "dublin", name: "Dublin", center: [-6.26, 53.35] as const },
    { id: "dundalk", name: "Dundalk", center: [-6.41, 54.0] as const },
    { id: "ennis", name: "Ennis", center: [-9.0, 52.84] as const },
    { id: "galway", name: "Galway", center: [-9.06, 53.27] as const },
    { id: "kilkenny", name: "Kilkenny", center: [-7.25, 52.65] as const },
    { id: "limerick", name: "Limerick", center: [-8.62, 52.66] as const },
    { id: "sligo", name: "Sligo", center: [-8.48, 54.27] as const },
    { id: "tralee", name: "Tralee", center: [-9.7, 52.27] as const },
    { id: "waterford", name: "Waterford", center: [-7.11, 52.25] as const },
    { id: "wexford", name: "Wexford", center: [-6.46, 52.34] as const },
] as const;

export type CityId = (typeof CITIES)[number]["id"];

export function getCityCenter(cityId: string | null | undefined): [number, number] | null {
    if (!cityId) return null;
    const city = CITIES.find((c) => c.id === cityId);
    return city ? [...city.center] : null;
}
