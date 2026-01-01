/*
  Hensikt:
  Denne fila er “manuset” til oppgavepanelet. Hver oppgave har tittel, mål og innhold
  (tekst, lenker og noen bilder) som guider brukeren gjennom GIS-analysen.

  Eksterne biblioteker / plattform (hvorfor og hvordan):
  - Vite (byggeverktøyet): Jeg bruker import.meta.env.BASE_URL for å lage riktig sti
    til bilder i public-mappa, uansett om appen kjører lokalt eller fra GitHub Pages.

  Min kode vs bibliotek:
  - Selve oppgavene/teksten og datastrukturen her er skrevet av meg.
  - import.meta.env.* er en Vite-funksjon (ikke vanlig “vanilla JS”).
*/

const tasks = [
  {
    id: 1,
    title: "Oppgave 1 – Last ned og klargjør data",
    goal: "Få alle relevante datasett inn i kartet.",
    content: [
      {
        type: "link",
        text: "data",
        url: "https://github.com/KristianLarsen01/TBA4251-GIS-Application/raw/refs/heads/main/public/data/data.zip",
        prefix: "Trykk på følgende lenke og last ned den zippede mappen",
      },
      "Pakk ut (unzip) mappen på PC-en din og trykk på «Last opp» øverst i verktøylinjen til venstre.",
      "Velg filene i den utpakkede data-mappen:",
      "• Leiligheter_finn.geojson",
      "• Arealbruk.geojson",
      "",
      "Når du er ferdig, skal du ha ett punktlag med 100 leiligheter og ett polygonlag som viser arealbruk i Trondheim.",
    ],
  },
  {
    id: 2,
    title: "Oppgave 2 – Opprett analysepolygon",
    goal: "Lage et analysepolygon over Trondheim.",
    content: [
      "Bruk polygon-tegneverktøyet til å tegne et polygon rundt Trondheim-området:",
      {
        type: "image",
        src: `${import.meta.env.BASE_URL}task_images/analysepolygon.png`,
        alt: "Eksempel på analysepolygon rundt Trondheim",
      },
      "Gi laget navnet «Analysepolygon» og en passende farge i lagpanelet. Det kan være lurt å flytte laget til toppen av laglisten med pilene.",
      "Dette laget skal brukes som maske for å klippe alle andre lag til kun å vise data innenfor analyseområdet.",
    ],
  },
  {
    id: 3,
    title: "Oppgave 3 – Filtrering av arealbruk",
    goal: "Filtrere arealbruk basert på type og størrelse.",
    content: [
      "Arealbruk-laget har en egenskap (property) kalt «featureType» som angir typen arealbruk.",
      "Bruk verktøyet Feature Extractor i verktøylinja for å beholde kun polygoner der «featureType» er lik «SportIdrettPlass».",
      "For å fjerne små idrettsplasser bruker du verktøyet Area Filter og setter minimumsareal til 4000 m².",
      "Bruk deretter Clip-verktøyet på dette laget med Analysepolygon som maske.",
      "Kall det nye laget «Fotballbaner», og slett de tre tidligere Arealbruk-lagene.",
      "Du skal nå sitte igjen med et polygonlag som i hovedsak viser fotballbaner.",
    ],
  },
  {
    id: 4,
    title: "Oppgave 4 – Manuell opprydding av fotballbaner",
    goal: "Sitte igjen med kun fotballbaner.",
    content: [
      "Datasett inneholder ofte mer informasjon enn det man trenger i en analyse.",
      "For å rydde manuelt i laget kan det være nyttig å sette bakgrunnskartet til «Satellitt» nederst i høyre hjørne, og skjule lagene Analysepolygon og Leiligheter_finn i lagpanelet.",
      "Trykk på redigeringsikonet «✏️» ved laget «Fotballbaner» i lagpanelet for å gå inn i redigeringsmodus.",
      "Gå gjennom polygonene og slett de som ikke er fotballbaner, for eksempel friidrettsbanen på Øya.",
      "Marker polygonene du vil slette ved å klikke på dem, og trykk deretter Enter eller OK-knappen øverst til venstre.",
    ],
  },
  {
    id: 5,
    title: "Oppgave 5 – Avstand til fotballbaner",
    goal: "Opprette buffere rundt fotballbanene.",
    content: [
      "Som en ivrig fotballspiller ønsker du å bo veldig nær en fotballbane.",
      "Ideelt sett er fotballbanen innen 300 meter gange, men opptil 1200 meter regnes som ok.",
      "Bruk Buffer-verktøyet på laget «Fotballbaner» to ganger: først med radius 300 meter, deretter 1200 meter.",
      "Bruk så Dissolve-verktøyet på begge bufferlagene for å slå sammen polygonene i lagene (bruk «Dissolve all»).",
      "Kall de nye lagene «300m_bane» og «1200m_bane», og slett de opprinnelige buffer- og dissolve-lagene.",
    ],
  },
  {
    id: 6,
    title: "Oppgave 6 – God, ok og dårlig tilgang",
    goal: "Opprette polygoner for ulike nivåer av tilgang til fotballbaner.",
    content: [
      "Laget «300m_bane» viser områder med god tilgang til fotballbaner.",
      "Laget «1200m_bane» representerer områder med minimum akseptabel (ok) tilgang.",
      "Bruk Clip-verktøyet på begge lagene med Analysepolygon som maske for å fjerne områder utenfor analyseområdet.",
      "Slett de opprinnelige bufferlagene og kall de nye lagene «God_tilgang» og «Ok_tilgang».",
      "For å lage polygonet med dårlig tilgang bruker du Difference-verktøyet.",
      "Bruk Analysepolygon som hovedlag og trekk fra «Ok_tilgang». Kall det nye laget «Dårlig_tilgang».",
    ],
  },
  {
    id: 7,
    title: "Oppgave 7 – Interessante leiligheter",
    goal: "Finne leiligheter du er spesielt interessert i.",
    content: [
      "Av de 100 leilighetene i laget «Leiligheter_finn» er det 10 som er spesielt interessante.",
      "Bruk igjen verktøyet Feature Extractor i verktøylinja for å hente ut leiligheter der egenskapen «interesse» er lik «høy».",
      "Alternativt kan du bruke punkt-tegneverktøyet til å lage ditt eget punktlag med interessante leiligheter.",
      "Kall laget «Leiligheter», og sørg for at lagrekkefølgen i laglisten er: Dårlig_tilgang, Ok_tilgang, God_tilgang, Leiligheter.",
    ],
  },
  {
    id: 8,
    title: "Oppgave 8 – Din optimale leilighet",
    content: [
      "Basert på analysepolygonet, bufferavstandene og plasseringen av leilighetene kan du nå se hvilke leiligheter som har god, ok eller dårlig tilgang til fotballbaner.",
      "Denne GIS-analysen gir deg dermed et godt grunnlag for å velge den leiligheten som passer ditt fotballbehov best.",
      "Gratulerer – du har nå fullført alle oppgavene i veilederen!",
    ],
  },
];

export default tasks;
