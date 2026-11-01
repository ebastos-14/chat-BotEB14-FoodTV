export const RAPTOR_PATH = "/assets/raptors/";

export const RAPTOR_SHEETS = Object.freeze([
"Raptor_Base.png",
"Raptor_Vip.png",
"Raptor_Sub.png",
"Raptor_Mod.png",
"Raptor_EBastos14.png",
"Raptor_JaciiTV_1.png",
"Raptor_JaciiTV_2.png"
]);

export const RAPTOR_PROFILES = Object.freeze({
lateral: Object.freeze({
source: Object.freeze({
x: 35,
y: 165,
width: 380,
height: 550
}),

allowedSheets: Object.freeze([
  "Raptor_Mod.png",
  "Raptor_EBastos14.png",
  "Raptor_JaciiTV_1.png",
  "Raptor_JaciiTV_2.png"
])

}),

front: Object.freeze({
source: Object.freeze({
x: 453,
y: 165,
width: 360,
height: 550
}),

allowedSheets: Object.freeze([
  "Raptor_Mod.png",
  "Raptor_EBastos14.png",
  "Raptor_JaciiTV_1.png",
  "Raptor_JaciiTV_2.png"
])

}),

back: Object.freeze({
source: Object.freeze({
x: 850,
y: 165,
width: 380,
height: 550
}),

allowedSheets: Object.freeze([
  "Raptor_Base.png",
  "Raptor_Vip.png",
  "Raptor_Sub.png",
  "Raptor_Mod.png",
  "Raptor_EBastos14.png",
  "Raptor_JaciiTV_1.png",
  "Raptor_JaciiTV_2.png"
])

})
});

export const DEFAULT_RAPTOR_SHEET = "Raptor_Mod.png";

export function getRaptorProfile(profileName) {
const profile = RAPTOR_PROFILES[profileName];

if (!profile) {
throw new Error(
"Perfil de Raptor desconocido: "${profileName}"."
);
}

return profile;
}

export function isRaptorSheetAllowed(profileName, sheetName) {
const profile = getRaptorProfile(profileName);

return profile.allowedSheets.includes(sheetName);
}

export function validateRaptorAssignment(profileName, sheetName) {
if (!RAPTOR_SHEETS.includes(sheetName)) {
throw new Error(
"Spritesheet de Raptor desconocido: "${sheetName}"."
);
}

if (!isRaptorSheetAllowed(profileName, sheetName)) {
throw new Error(
"El spritesheet "${sheetName}" no está permitido para el perfil "${profileName}"."
);
}

return true;
}
