// src/data/tasks.js

const tasks = [
  {
    id: 1,
    title: "Oppgave 1 – Last ned og klargjør data",
    goal: "Få alle relevante datasett inn i kartet.",
    content: [
      {
        type: "link",
        text: "data",
        url: "https://github.com/KristianLarsen01/TBA4251-GIS-Application/tree/main/public/data",
        prefix: "Trykk på følgende lenke og last ned den zippede mappen",
      },
      "Unzip mappen på PC-en din og trykk på opplastningsknappen øverst i verktøylinjen til venstre.",
      "Velg filene i den nye unzippede data-mappen:",
      "• Leiligheter_finn.geojson",
      "• Arealbruk.geojson",
      "",
      "Når du er ferdig har du 100 punkter som viser boliger, og mange polygoner som viser arealbruk i Trondheim.",
    ],
  },
  {
    id: 2,
    title: "Oppgave 2 – Opprett analysepolygon",
    goal: "Lag et analysepolygon over Trondheim.",
    content: [
      "Bruk Polygon-tegneverktøyet til å tegne et polygon rundt Trondheim-området:",
      {
        type: "image",
        src: "./public/task_images/analysepolygon.png",
        alt: "Eksempel på analysepolygon rundt Trondheim",
      },
      "Gi laget navnet 'Analysepolygon' og en passende farge, det kan være greit å flytte dette laget til toppen av laglisten i Lag-panelet. (Bruk pilene opp/ned)",
      "Dette laget skal brukes til å klippe alle andre lag til kun å vise data innenfor ditt analyseområde.",
    ],
  },
  {
    id: 3,
    title: "Oppgave 3 – Rydd Arealbruk-laget",
    goal: "Fjerne alle unødvendige polygon.",
    content: [
      "Dette laget har property 'featureType' som angir hva slags arealbruk det er.",
      "Bruk Area Filter for å beholde kun de som har 'featureType' lik 'SportIdrettPlass'.",
      "",
      "• Velg laget Personer.",
      "• Bruk Buffer med radius for gangavstand, for eksempel 700 meter.",
      "• Lagre resultatet som Person_gangbuffer.",
      "",
      "Dette laget viser alle områdene hver person kan nå ved å gå."
    ],
  },
  {
    id: 4,
    title: "Oppgave 4 – Hvem når kollektivstopp ved å gå?",
    goal: "Finne hvilke personer som kan gå til et kollektivstopp.",
    content: [
      "Bruk Intersect igjen mellom:",
      "• Person_gangbuffer",
      "• Kollektiv",
      "",
      "Lagre resultatet som Treff_gang_person_stopp.",
      "",
      "Dette laget viser hvilke holdeplasser hver person faktisk kan gå til.",
      "De som ikke får treff her, er personer som ikke kan bruke kollektiv i denne analysen (med valgt gangavstand)."
    ],
  },
  {
    id: 5,
    title: "Oppgave 5 – Kollektivtilgjengelighet til fotballbaner",
    goal: "Finne hvilke holdeplasser som ligger nær fotballbaner, og dermed kan brukes som kollektivtilgang til banene.",
    content: [
      "Vi antar at man kan gå ca. 700 meter fra stopp til banen også:",
      "• Velg laget Kollektiv.",
      "• Bruk Buffer, radius f.eks. 700 meter, og lag Stopp_bane_buffer.",
      "",
      "Kjør Intersect mellom:",
      "• Stopp_bane_buffer",
      "• Fotballbaner",
      "",
      "Lagre resultatet som Treff_stopp_bane.",
      "",
      "Dette laget viser hvilke holdeplasser som har en fotballbane innen gangavstand fra stoppet.",
      "",
      "Tolkning:",
      "Hvis en person kan gå til et stopp (Treff_gang_person_stopp) og stoppet har en bane innen sin buffer (Treff_stopp_bane),",
      "så kan personen nå banen via gang + kollektiv + gang."
    ],
  },
  {
    id: 6,
    title: "Oppgave 6 – Sykle til banen (sykkelbuffer)",
    goal: "Finne hvilke personer som kan nå baner direkte med sykkel.",
    content: [
      "Vi antar at man kan sykle lenger enn man går, for eksempel 2500 meter:",
      "• Velg Personer.",
      "• Bruk Buffer med radius ca. 2500 meter og lag Person_sykkelbuffer.",
      "",
      "Kjør Intersect mellom:",
      "• Person_sykkelbuffer",
      "• Fotballbaner",
      "",
      "Lagre resultatet som Treff_sykkel_person_bane.",
      "Dette laget viser hvilke fotballbaner hver person kan nå direkte ved å sykle."
    ],
  },
  {
    id: 7,
    title: "Oppgave 7 – Rydd opp resultatene (Difference & Area Filter)",
    goal: "Skille mellom de som har god tilgang og de som står igjen med dårlig tilgang.",
    content: [
      "Bruk Area Filter på intersect-lagene (Treff_gang_person_bane, Treff_sykkel_person_bane, Treff_stopp_bane):",
      "• Fjern veldig små geometriflak som bare er støy (f.eks. areal < 50–100 m²).",
      "",
      "Bruk Difference for å finne personer uten noen reell tilgang:",
      "• Ta utgangspunkt i Personer.",
      "• Trekk fra alle personer som har treff i enten:",
      "  - gang til bane,",
      "  - sykkel til bane,",
      "  - eller gang til stopp som har bane (kollektiv).",
      "",
      "Lag et eget lag Personer_uten_tilgang.",
      "Dette steget viser hvem som faller utenfor alle realistiske alternativer."
    ],
  },
  {
    id: 8,
    title:
      "Oppgave 8 – Finn den optimale fotballbanen (Feature Extractor + evt. Union)",
    goal: "Kombinere all informasjon for å velge én vinnerbane.",
    content: [
      "Slå gjerne sammen alle treff-lag til ett samlet tilgjengelighetslag:",
      "• Bruk Union på Treff_gang_person_bane, Treff_sykkel_person_bane og banene fra Treff_stopp_bane.",
      "• Lag et lag Tilgjengelighet_total.",
      "",
      "Bruk Feature Extractor på Tilgjengelighet_total:",
      "• Gruppér/filtrer på banenavn.",
      "• Tell hvor mange personer som når hver bane (uansett transportmåte).",
      "",
      "Finn den fotballbanen som har flest personer innen:",
      "• gangavstand, eller",
      "• sykkelavstand, eller",
      "• via kollektiv (gang → stopp → gang).",
      "",
      "Presenter resultatet:",
      "«Den mest tilgjengelige fotballbanen er [BANENAVN]. Den kan nås av X av 10 personer ved å gå, sykle eller kombinere gang og kollektiv.»",
      "",
      "Når du er ferdig med dette steget, er analysen fullført. 👏"
    ],
  },
];

export default tasks;
