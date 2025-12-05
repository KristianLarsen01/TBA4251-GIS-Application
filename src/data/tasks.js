// src/data/tasks.js

const tasks = [
  {
    id: 1,
    title: "Oppgave 1 – Last inn og avgrens data",
    goal: "Få alle relevante datasett inn i kartet og klipp dem til Trondheim.",
    content: [
      "Last inn følgende lag:",
      "• TrondheimKommune.geojson (kommunepolygon)",
      "• Personer.geojson (10 adressepunkter – én per venn)",
      "• Fotballbaner.geojson (fotballbaner/idrettsanlegg)",
      "• Kollektiv.geojson (holdeplasser/busstopp)",
      "",
      "Bruk Clip til å avgrense alle lag til Trondheim kommune:",
      "• Klipp Personer, Fotballbaner og Kollektiv med TrondheimKommune.",
      "",
      "Du har nå et ryddig analysekart der alle objekter ligger innenfor kommunen.",
      "Trykk Neste."
    ]
  },
  {
    id: 2,
    title: "Oppgave 2 – Gå-avstand fra hver person (gangbuffer)",
    goal: "Lage en buffersone rundt hver person som viser hvor langt de kan gå.",
    content: [
      "Vi antar at alle i vennegjengen kan gå omtrent 10 minutter til fots:",
      "• Velg laget Personer.",
      "• Bruk Buffer med radius for gangavstand, f.eks. 700 meter.",
      "• Lagre resultatet som Person_gangbuffer.",
      "",
      "Dette laget viser alle områdene hver person kan nå ved å gå.",
      "Trykk Neste."
    ]
  },
  {
    id: 3,
    title: "Oppgave 3 – Hvem når en fotballbane bare ved å gå?",
    goal: "Finne hvilke personer som kan gå direkte til en fotballbane.",
    content: [
      "Bruk Intersect mellom:",
      "• Person_gangbuffer (fra forrige oppgave)",
      "• Fotballbaner",
      "",
      "Lagre resultatet som Treff_gang_person_bane.",
      "Resultatet viser alle fotballbaner som ligger innen gangavstand for minst én person, og hvilke personer det gjelder.",
      "",
      "Noter gjerne:",
      "• Hvor mange personer kan gå til en bane?",
      "• Hvilke baner har flest personer innen gangavstand?",
      "Trykk Neste."
    ]
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
      "De som ikke får treff her, er personer som ikke kan bruke kollektiv i denne analysen (med valgt gangavstand).",
      "Trykk Neste."
    ]
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
      "Tolkning:",
      "Hvis en person kan gå til et stopp (Treff_gang_person_stopp) og stoppet har en bane innen sin buffer (Treff_stopp_bane),",
      "så kan personen nå banen via gang + kollektiv + gang.",
      "",
      "I web-GIS-et ditt gjør vi dette ved å sammenligne hvilke stopp som går igjen i begge lag.",
      "Trykk Neste."
    ]
  },
  {
    id: 6,
    title: "Oppgave 6 – Sykle til banen (sykkelbuffer)",
    goal: "Finne hvilke personer som kan nå baner direkte med sykkel.",
    content: [
      "Vi antar at man kan sykle lenger enn man går, f.eks. 2500 meter:",
      "• Velg Personer.",
      "• Bruk Buffer med radius f.eks. 2500 meter og lag Person_sykkelbuffer.",
      "",
      "Kjør Intersect mellom:",
      "• Person_sykkelbuffer",
      "• Fotballbaner",
      "",
      "Lagre resultatet som Treff_sykkel_person_bane.",
      "Dette laget viser hvilke fotballbaner hver person kan nå direkte ved å sykle.",
      "Trykk Neste."
    ]
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
      "Dette steget viser hvem som faller utenfor alle realistiske alternativer.",
      "Trykk Neste."
    ]
  },
  {
    id: 8,
    title: "Oppgave 8 – Finn den optimale fotballbanen (Feature Extractor + evt. Union)",
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
      "Presenter resultatet for brukeren:",
      "«Den mest tilgjengelige fotballbanen er [BANENAVN]. Den kan nås av X av 10 personer ved å gå, sykle eller kombinere gang og kollektiv.»",
      "",
      "Du har nå fullført analysen 👏"
    ]
  }
];

export default tasks;
