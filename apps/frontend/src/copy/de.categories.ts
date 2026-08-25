/**
 * The German page copy: the intro and the questions for every category.
 *
 * A rewrite rather than a translation. The English intros were written to read
 * well; these were written to answer what a German speaker actually types,
 * which is not always the same sentence. "WC" outdraws "öffentliche Toilette"
 * in casual search and both appear here; "Tankstelle" is the only word for a
 * fuel station and the en-GB/en-US split above it does not exist in German.
 *
 * Its own file rather than more of de.ts, because de.ts is the chrome — 600
 * words that ship on every page in every city — and this is the 3,800 word
 * half that only earns its keep once German cities get URL trees of their own.
 * Two files, two review passes, two different times they matter.
 *
 * Register is the informal "du" throughout, matching the chrome deck and what
 * a consumer map app uses in German. Placeholders are `{city}` and `{count}`.
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER. See the note in de.ts.
 */
import type { CategoryCopy } from "./types";

export const deCategories: Record<string, CategoryCopy> = {
  toilets: {
    plural: "öffentliche Toiletten",
    singular: "öffentliche Toilette",
    heading: "Öffentliche Toiletten",
    intro: {
      one: "In und um {city} ist eine öffentliche Toilette verzeichnet. Wo die Daten es hergeben, findest du auch die Öffnungszeiten, ob eine Gebühr anfällt und ob sie stufenlos zugänglich ist.",
      other:
        "In und um {city} sind {count} öffentliche Toiletten verzeichnet. Die Liste unten führt die auf, die in OpenStreetMap einen Namen tragen; auf der Karte stehen alle, auch die namenlosen Straßen-WCs und die in Parks, Bahnhöfen und Einkaufszentren. Wo die Daten es hergeben, bekommst du zusätzlich Öffnungszeiten, ob eine Gebühr anfällt und ob die Toilette stufenlos zugänglich ist.",
    },
    faq: [
      {
        q: "Wo finde ich eine öffentliche Toilette in {city}?",
        a: {
          one: "Öffne die Karte oben, sie zeigt {city} mit der einen verzeichneten Toilette. Tippe auf die Markierung für die genaue Lage, die Öffnungszeiten sofern bekannt, und den Fußweg dorthin. Erlaubst du den Standortzugriff, folgt die Karte stattdessen dir, was schneller ist, wenn du schon unterwegs bist.",
          other:
            "Öffne die Karte oben, sie zeigt {city} mit allen {count} verzeichneten Toiletten. Tippe auf eine Markierung für die genaue Lage, die Öffnungszeiten sofern bekannt, und den Fußweg dorthin. Erlaubst du den Standortzugriff, folgt die Karte stattdessen dir, was schneller ist, wenn du schon unterwegs bist.",
        },
      },
      {
        q: "Sind öffentliche Toiletten in {city} kostenlos?",
        a: "Das hängt von der Stadt und der einzelnen Toilette ab. Wo OpenStreetMap eine Gebühr verzeichnet, steht sie am Punkt. Am ehesten kostenpflichtig sind Toiletten in Bahnhöfen und Einkaufszentren; städtische Straßen-WCs und Park-Toiletten sind meist kostenlos.",
      },
      {
        q: "Gibt es barrierefreie Toiletten in {city}?",
        a: "Ja. Punkte, die in OpenStreetMap als stufenlos zugänglich getaggt sind, zeigen das im Detailbereich. Dieses Tag ist ungleichmäßig gepflegt, eine Toilette ohne Angabe ist also nicht zwangsläufig unzugänglich, sondern oft schlicht nicht erfasst.",
      },
      {
        q: "Warum stehen bei manchen Toiletten keine Öffnungszeiten?",
        a: "Öffnungszeiten sind in OpenStreetMap ein optionales Tag, und viele Mitwirkende erfassen nur den Standort. Ein fehlender Wert heißt, dass niemand nachgesehen hat, nicht dass rund um die Uhr geöffnet ist.",
      },
    ],
  },

  "drinking-water": {
    plural: "Trinkwasserstellen",
    singular: "Trinkwasserstelle",
    heading: "Trinkwasser",
    intro: {
      one: "In {city} ist eine Stelle zum Auffüllen einer Flasche verzeichnet. Als nicht trinkbar getaggte Punkte sind herausgefiltert, was du siehst, ist also Wasser, das du wirklich trinken kannst.",
      other:
        "In {city} sind {count} Stellen zum Auffüllen einer Flasche verzeichnet: öffentliche Trinkbrunnen, Zapfstellen, Brunnen und Quellen, bei denen das Wasser bestätigt trinkbar ist. Als nicht trinkbar getaggte Punkte sind herausgefiltert, was du siehst, ist also Wasser, das du wirklich trinken kannst.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} eine Wasserflasche auffüllen?",
        a: {
          one: "Die Karte zeigt die eine verzeichnete Trinkwasserstelle in {city}. Tippe auf die Markierung für den Weg dorthin.",
          other:
            "Die Karte zeigt alle {count} verzeichneten Trinkwasserstellen in {city}, die meisten davon in Parks, auf Plätzen und entlang von Spazierwegen. Tippe auf eine Markierung für den Weg dorthin.",
        },
      },
      {
        q: "Ist das Wasser aus diesen Brunnen trinkbar?",
        a: "Jeder hier gezeigte Punkt ist in OpenStreetMap als Trinkwasser getaggt, ausdrücklich als nicht trinkbar markierte Quellen sind ausgeschlossen. Brunnen können trotzdem saisonal sein, in kalten Regionen ist über den Winter mit vielen abgestellten zu rechnen.",
      },
      {
        q: "Sind Trinkbrunnen in {city} ganzjährig in Betrieb?",
        a: "In Städten mit Frost werden Brunnen im Freien meist von Herbst bis Frühjahr entleert und abgestellt, damit die Leitungen nicht platzen. Die Karte verfolgt diese saisonale Abschaltung nicht, im Winter sind die Ergebnisse also ungefähre Angaben.",
      },
    ],
  },

  playgrounds: {
    plural: "Spielplätze",
    singular: "Spielplatz",
    heading: "Spielplätze",
    intro: {
      one: "In und um {city} ist ein Spielplatz verzeichnet. Die Karte zeigt ihn, ob OpenStreetMap einen Namen dafür hat oder nicht.",
      other:
        "In und um {city} sind {count} Spielplätze verzeichnet. Die Liste nennt die, für die OpenStreetMap einen Namen hat, meist die größeren Parkspielplätze; die Karte ergänzt jeden namenlosen im Wohngebiet.",
    },
    faq: [
      {
        q: "Wie viele Spielplätze gibt es in {city}?",
        a: {
          one: "Einer ist derzeit in OpenStreetMap im Gebiet dieser Seite erfasst. Wo die Kartierung noch dünn ist, ist das zu wenig, und bei einer so niedrigen Zahl ist genau das die wahrscheinliche Erklärung.",
          other:
            "{count} sind derzeit in OpenStreetMap im Gebiet dieser Seite erfasst. In gut kartierten Städten kommt das der Wirklichkeit nahe, anderswo ist es zu wenig.",
        },
      },
      {
        q: "Welcher Spielplatz in {city} ist mir am nächsten?",
        a: 'Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich, mit den nächstgelegenen Spielplätzen ringsum. Du kannst Spielplätze mit der Zusammenstellung "Familie" auch mit Toiletten und Eis kombinieren, was für einen Ausflug meist das ist, was man wirklich braucht.',
      },
      {
        q: "Steht dabei, welche Geräte ein Spielplatz hat?",
        a: "Nur wenn jemand es erfasst hat. OpenStreetMap kann Schaukeln, Rutschen, Klettergerüste und die vorgesehene Altersgruppe festhalten, die meisten Punkte tragen aber nur den Standort und manchmal einen Namen.",
      },
    ],
  },

  parking: {
    plural: "Parkplätze",
    singular: "Parkplatz",
    heading: "Parken",
    intro: {
      one: "In {city} ist ein Parkplatz verzeichnet, private Stellplätze und Anwohnerparken sind herausgefiltert.",
      other:
        "In {city} sind {count} Parkplätze und Parkflächen verzeichnet, private Stellplätze und Anwohnerparken sind herausgefiltert. Das umfasst Parkstreifen, ebenerdige Flächen und Parkhäuser.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} parken?",
        a: {
          one: "Die Karte zeigt eine öffentlich nutzbare Parkfläche. Punkte, die ausdrücklich als privat getaggt sind, sind ausgeschlossen, übrig bleibt also Parken, auf das du normalerweise einfahren darfst.",
          other:
            "Die Karte zeigt {count} öffentlich nutzbare Parkflächen. Punkte, die ausdrücklich als privat getaggt sind, sind ausgeschlossen, übrig bleibt also Parken, auf das du normalerweise einfahren darfst.",
        },
      },
      {
        q: "Werden hier Parkgebühren angezeigt?",
        a: "Nur wo OpenStreetMap sie erfasst hat, und das ist eine Minderheit der Punkte. Nimm die Karte, um die Parkflächen zu finden, und prüfe den Preis dann am Schild oder beim Betreiber.",
      },
      {
        q: "Ist kostenloses Parken gesondert markiert?",
        a: "Wo das Gebühren-Tag vorhanden ist, steht es in den Details des Punkts. Weil die Abdeckung ungleichmäßig ist, kann ein Parkplatz ohne Angabe beides sein, also lohnt sich der Blick vor Ort.",
      },
    ],
  },

  "charging-stations": {
    plural: "Ladesäulen",
    singular: "Ladesäule",
    heading: "Ladesäulen",
    intro: {
      one: "In {city} ist eine Ladesäule für Elektroautos verzeichnet. OpenStreetMap erfasst auch Betreiber, die die großen proprietären Apps oft auslassen, besonders kleine kommunale Ladepunkte und die an Hotels.",
      other:
        "In {city} sind {count} Ladesäulen für Elektroautos verzeichnet, vom einzelnen Ladepunkt am Straßenrand bis zum Schnelllader an der Autobahn. OpenStreetMap erfasst auch Betreiber, die die großen proprietären Apps oft auslassen, besonders kleine kommunale Ladepunkte und die an Hotels.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} ein Elektroauto laden?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Ladesäule. Tippe darauf für die Lage und alles, was bei der Erfassung zu Steckertypen und Betreiber festgehalten wurde.",
          other:
            "Die Karte zeigt {count} verzeichnete Ladesäulen. Tippe auf eine für die Lage und alles, was bei der Erfassung zu Steckertypen und Betreiber festgehalten wurde.",
        },
      },
      {
        q: "Sehe ich hier, ob eine Ladesäule gerade frei ist?",
        a: "Nein. OpenStreetMap ist eine Karte dessen, was existiert, kein Live-Feed über die Verfügbarkeit. Für den Echtzeitstatus brauchst du weiterhin die App des Betreibers.",
      },
      {
        q: "Welche Steckertypen werden angezeigt?",
        a: "Wo jemand sie erfasst hat, stehen die Anschlussarten in den Details des Punkts. Bei neueren und größeren Anlagen ist die Abdeckung besser als bei älteren Ladepunkten am Straßenrand.",
      },
    ],
  },

  "gas-stations": {
    plural: "Tankstellen",
    singular: "Tankstelle",
    heading: "Tankstellen",
    intro: {
      one: "In und um {city} ist eine Tankstelle verzeichnet. OpenStreetMap erfasst auch die freien und automatisierten, die in markengebundenen Suchdiensten oft fehlen.",
      other:
        "In und um {city} sind {count} Tankstellen verzeichnet, einschließlich der freien und automatisierten, die in markengebundenen Suchdiensten oft fehlen.",
    },
    faq: [
      {
        q: "Wo ist die nächste Tankstelle in {city}?",
        a: {
          one: "Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit der einen verzeichneten Tankstelle, oder verschiebe die Karte in ein beliebiges Gebiet und suche dort.",
          other:
            "Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit den nächstgelegenen der {count} verzeichneten Tankstellen ringsum, oder verschiebe die Karte in ein beliebiges Gebiet und suche dort.",
        },
      },
      {
        q: "Werden hier Spritpreise angezeigt?",
        a: "Nein. Preise ändern sich täglich und OpenStreetMap führt sie nicht. Diese Seite ist dazu da, die Tankstellen zu finden, besonders die, die anderswo nicht auftauchen.",
      },
      {
        q: "Sind auch Tankstellen mit LPG oder Wasserstoff dabei?",
        a: "Sie sind enthalten, wo sie als Tankstelle erfasst sind. Welche Kraftstoffe es gibt, hält OpenStreetMap in eigenen Tags fest, die nicht überall gepflegt sind, also prüfe das vor einer weiten Anfahrt.",
      },
    ],
  },

  "ice-cream": {
    plural: "Eisdielen",
    singular: "Eisdiele",
    heading: "Eis",
    intro: {
      one: "In {city} ist eine Eisdiele, Gelateria oder ein Eiskiosk verzeichnet, wobei sowohl reine Eisläden als auch Cafés erfasst sind, deren Hauptgeschäft Eis ist.",
      other:
        "In {city} sind {count} Eisdielen, Gelaterias und Eiskioske verzeichnet, sowohl reine Eisläden als auch Cafés, deren Hauptgeschäft Eis ist.",
    },
    faq: [
      {
        q: "Wo bekomme ich in {city} Eis?",
        a: {
          one: "Die Karte zeigt einen verzeichneten Ort. Saisonale Kioske sind enthalten, falls es einer ist, hat er außerhalb des Sommers wahrscheinlich zu.",
          other:
            "Die Karte zeigt {count} verzeichnete Orte. Saisonale Kioske sind enthalten, außerhalb des Sommers hat also ein Teil davon zu.",
        },
      },
      {
        q: "Werden Öffnungszeiten angezeigt?",
        a: "Wo jemand sie erfasst hat, ja. Bei Eisdielen sind sie besonders unzuverlässig, weil viele saisonal öffnen und die Zeiten im Sommer und Winter andere sind. Nimm sie als Anhaltspunkt, nicht als Zusage.",
      },
    ],
  },

  "dog-parks": {
    plural: "Hundewiesen",
    singular: "Hundewiese",
    heading: "Hundewiesen",
    intro: {
      one: "In {city} ist eine eingezäunte Hundewiese oder Freilauffläche verzeichnet. Gemeint sind Flächen, auf denen ein Hund ohne Leine laufen darf, im Unterschied zu Parks, die Hunde lediglich erlauben.",
      other:
        "In {city} sind {count} eingezäunte Hundewiesen und Freilaufflächen verzeichnet. Gemeint sind Flächen, auf denen ein Hund ohne Leine laufen darf, im Unterschied zu Parks, die Hunde lediglich erlauben.",
    },
    faq: [
      {
        q: "Wo darf mein Hund in {city} ohne Leine laufen?",
        a: {
          one: 'Die Karte zeigt eine verzeichnete Hundewiese oder Freilauffläche. Kombiniere sie mit der Zusammenstellung "Gassi gehen" mit Trinkwasser und Toiletten für die ganze Runde.',
          other:
            'Die Karte zeigt {count} verzeichnete Hundewiesen und Freilaufflächen. Kombiniere sie mit der Zusammenstellung "Gassi gehen" mit Trinkwasser und Toiletten für die ganze Runde.',
        },
      },
      {
        q: "Sind die Flächen eingezäunt?",
        a: "Manche. OpenStreetMap kann eine Einzäunung festhalten, tut es aber nicht überall. Bei einem Hund, der nicht zuverlässig zurückkommt, lohnt der Blick auf die Details des Punkts, bevor du ihn ableinst.",
      },
    ],
  },

  "picnic-spots": {
    plural: "Picknickplätze",
    singular: "Picknickplatz",
    heading: "Picknickplätze",
    intro: {
      one: "Rund um {city} ist ein Picknickplatz verzeichnet, entweder ein einzelner Tisch am Weg oder ein angelegter Platz mit mehreren Tischen und einer Feuerstelle.",
      other:
        "Rund um {city} sind {count} Picknickplätze verzeichnet, vom einzelnen Tisch am Weg bis zum angelegten Platz mit mehreren Tischen und einer Feuerstelle.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} picknicken?",
        a: {
          one: "Die Karte zeigt einen verzeichneten Picknicktisch oder -platz, höchstwahrscheinlich in einem Park oder an einem Wander- oder Radweg.",
          other:
            "Die Karte zeigt {count} verzeichnete Picknicktische und -plätze, die meisten davon in Parks und entlang von Wander- und Radwegen.",
        },
      },
      {
        q: "Darf ich dort grillen?",
        a: 'Nur wo ausdrücklich eine Feuerstelle oder ein Grill vorhanden ist, und auch dann gelten örtliche Feuerverbote. Schalte die Kategorie "Feuerstellen & Grill" dazu, um zu sehen, wo es eine gibt.',
      },
    ],
  },

  viewpoints: {
    plural: "Aussichtspunkte",
    singular: "Aussichtspunkt",
    heading: "Aussichtspunkte",
    intro: {
      one: "Rund um {city} ist ein Aussichtspunkt verzeichnet: eine markierte Stelle, an der die Aussicht der Zweck ist, ob Aussichtsturm, Terrasse, Vogelbeobachtungshütte oder ein unmarkierter Grat, den jemand erfasst hat.",
      other:
        "Rund um {city} sind {count} Aussichtspunkte verzeichnet: die markierten Stellen, an denen die Aussicht der Zweck ist, von Aussichtstürmen und Terrassen bis zu Vogelbeobachtungshütten und unmarkierten Graten, die Ortskundige erfasst haben.",
    },
    faq: [
      {
        q: "Wo hat man in {city} die beste Aussicht?",
        a: {
          one: "Die Karte zeigt einen verzeichneten Aussichtspunkt. OpenStreetMap bewertet sie nicht, der Wert liegt hier also darin, die zu finden, die in keinem Reiseführer stehen, nicht die berühmte Terrasse, die ohnehin jeder kennt.",
          other:
            "Die Karte zeigt {count} verzeichnete Aussichtspunkte. OpenStreetMap bewertet sie nicht, der Wert liegt hier also darin, die zu finden, die in keinem Reiseführer stehen, nicht die berühmte Terrasse, die ohnehin jeder kennt.",
        },
      },
      {
        q: "Kostet der Zugang etwas?",
        a: "Die meisten sind frei zugänglich. Aussichtstürme und Plattformen auf Gebäuden verlangen manchmal Eintritt, und wo OpenStreetMap eine Gebühr erfasst hat, steht sie am Punkt.",
      },
    ],
  },

  beaches: {
    plural: "Strände und Badestellen",
    singular: "Strand oder Badestelle",
    heading: "Strände und Baden",
    intro: {
      one: "Rund um {city} ist ein Strand oder eine ausgewiesene Badestelle verzeichnet, wobei auch Badestellen an Seen und Flüssen erfasst sind, nicht nur die Küste.",
      other:
        "Rund um {city} sind {count} Strände und ausgewiesene Badestellen verzeichnet, an Seen und Flüssen ebenso wie an der Küste.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} baden?",
        a: {
          one: 'Die Karte zeigt einen verzeichneten Strand oder eine Badestelle. Kombiniere sie mit der Zusammenstellung "Familie" mit Toiletten, Parken und Eis.',
          other:
            'Die Karte zeigt {count} verzeichnete Strände und Badestellen. Kombiniere sie mit der Zusammenstellung "Familie" mit Toiletten, Parken und Eis.',
        },
      },
      {
        q: "Ist das Wasser sauber?",
        a: "Das sagt diese Karte nicht. Badegewässerqualität wird von Behörden gemessen und saisonal veröffentlicht, OpenStreetMap führt sie nicht. Für die aktuelle Einstufung sieh bei der örtlichen Stelle nach.",
      },
      {
        q: "Gibt es dort Aufsicht?",
        a: "Nur an wenigen, und OpenStreetMap erfasst es selten. Nimm an, dass keine Aufsicht da ist, sofern vor Ort nichts anderes steht.",
      },
    ],
  },

  atms: {
    plural: "Geldautomaten",
    singular: "Geldautomat",
    heading: "Geldautomaten",
    intro: {
      one: "In {city} ist ein Geldautomat verzeichnet, ob freistehend oder in einer Bank oder einem Geschäft.",
      other:
        "In {city} sind {count} Geldautomaten verzeichnet, sowohl freistehende als auch die in Banken und Geschäften.",
    },
    faq: [
      {
        q: "Wo ist der nächste Geldautomat in {city}?",
        a: {
          one: "Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit dem einen verzeichneten Automaten.",
          other:
            "Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit den nächstgelegenen der {count} verzeichneten Automaten ringsum.",
        },
      },
      {
        q: "Fallen Gebühren an?",
        a: "Das hängt von deiner Bank und vom Betreiber des Automaten ab. OpenStreetMap erfasst manchmal den Betreiber, was ein Hinweis ist, aber keine Auskunft über die Gebühr, die dir berechnet wird.",
      },
    ],
  },

  "post-boxes": {
    plural: "Briefkästen",
    singular: "Briefkasten",
    heading: "Briefkästen",
    intro: {
      one: "In {city} ist ein Briefkasten verzeichnet. Briefkästen im Straßenraum sind genau die Art kleiner Einrichtung, die allgemeine Karten-Apps auslassen und OpenStreetMap gründlich erfasst.",
      other:
        "In {city} sind {count} Briefkästen verzeichnet. Briefkästen im Straßenraum sind genau die Art kleiner Einrichtung, die allgemeine Karten-Apps auslassen und OpenStreetMap gründlich erfasst.",
    },
    faq: [
      {
        q: "Wo ist der nächste Briefkasten in {city}?",
        a: {
          one: "Die Karte zeigt den einen verzeichneten Briefkasten. Das ist eine der Kategorien, in denen OpenStreetMap klar die bessere Quelle ist, weil gängige Karten-Apps einzelne Briefkästen kaum führen.",
          other:
            "Die Karte zeigt alle {count} verzeichneten Briefkästen. Das ist eine der Kategorien, in denen OpenStreetMap klar die bessere Quelle ist, weil gängige Karten-Apps einzelne Briefkästen kaum führen.",
        },
      },
      {
        q: "Wann wird geleert?",
        a: "Wo jemand die Leerungszeiten erfasst hat, stehen sie in den Details des Punkts. Sie sind seltener erfasst als der Standort selbst, am Kasten steht es verlässlicher.",
      },
    ],
  },

  recycling: {
    plural: "Recyclingstellen",
    singular: "Recyclingstelle",
    heading: "Recycling",
    intro: {
      one: "In {city} ist eine Recyclingstelle verzeichnet, entweder ein einzelner Container an einer Straßenecke oder ein vollständiger Wertstoffhof.",
      other:
        "In {city} sind {count} Recyclingstellen verzeichnet, vom einzelnen Glascontainer an der Straßenecke bis zum vollständigen Wertstoffhof.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} Glas oder Papier entsorgen?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Recyclingstelle. Tippe darauf, um zu sehen, welche Materialien dort erfasst wurden.",
          other:
            "Die Karte zeigt {count} verzeichnete Recyclingstellen. Tippe auf eine, um zu sehen, welche Materialien dort erfasst wurden.",
        },
      },
      {
        q: "Welche Materialien werden angenommen?",
        a: "Wo jemand es erfasst hat, stehen die Materialien in den Details des Punkts: Glas, Papier, Verpackungen, Textilien, Elektrogeräte. Container im Straßenraum nehmen meist nur eines oder zwei davon.",
      },
    ],
  },

  "luggage-storage": {
    plural: "Gepäckaufbewahrungen",
    singular: "Gepäckaufbewahrung",
    heading: "Gepäckaufbewahrung",
    intro: {
      one: "In {city} ist ein Schließfach oder eine Gepäckaufbewahrung verzeichnet, höchstwahrscheinlich an einem Bahnhof, Flughafen oder Verkehrsknotenpunkt. Nützlich an dem Tag, an dem du auscheckst, der Zug aber erst abends geht.",
      other:
        "In {city} sind {count} Schließfächer und Gepäckaufbewahrungen verzeichnet, überwiegend an Bahnhöfen, Flughäfen und Verkehrsknotenpunkten. Nützlich an dem Tag, an dem du auscheckst, der Zug aber erst abends geht.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} mein Gepäck lassen?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Schließfachanlage oder Gepäckaufbewahrung. In den meisten Städten ist der Hauptbahnhof die verlässliche Adresse.",
          other:
            "Die Karte zeigt {count} verzeichnete Schließfachanlagen und Gepäckaufbewahrungen. In den meisten Städten ist der Hauptbahnhof die verlässliche Adresse.",
        },
      },
      {
        q: "Was kostet das?",
        a: "Das setzt jeder Betreiber selbst fest, üblich ist ein Tagespreis je Fach. OpenStreetMap erfasst den Preis selten, rechne mit dem Aushang vor Ort.",
      },
    ],
  },

  libraries: {
    plural: "Bibliotheken",
    singular: "Bibliothek",
    heading: "Bibliotheken",
    intro: {
      one: "In {city} ist eine Bibliothek verzeichnet, ob Stadtbibliothek, Zweigstelle, Haltestelle einer Fahrbibliothek oder ein offener Bücherschrank. Wo die Daten es hergeben, bekommst du zusätzlich Öffnungszeiten und ob das Gebäude stufenlos zugänglich ist.",
      other:
        "In {city} sind {count} Bibliotheken verzeichnet, von der Stadtbibliothek über Zweigstellen und Haltestellen der Fahrbibliothek bis zu offenen Bücherschränken, in denen Bücher kostenlos getauscht werden. Wo die Daten es hergeben, bekommst du zusätzlich Öffnungszeiten und ob das Gebäude stufenlos zugänglich ist.",
    },
    faq: [
      {
        q: "Wo ist die nächste Bibliothek in {city}?",
        a: {
          one: "Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit der einen verzeichneten Bibliothek, oder verschiebe die Karte in ein beliebiges Gebiet und suche dort. Tippe auf die Markierung für die Lage, die Öffnungszeiten sofern bekannt, und den Fußweg dorthin.",
          other:
            "Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit den nächstgelegenen der {count} verzeichneten Bibliotheken ringsum, oder verschiebe die Karte in ein beliebiges Gebiet und suche dort. Tippe auf eine Markierung für die Lage, die Öffnungszeiten sofern bekannt, und den Fußweg dorthin.",
        },
      },
      {
        q: "Kann ich hinein, ohne Mitglied zu sein?",
        a: "Öffentliche Bibliotheken lassen in aller Regel jeden herein, zum Lesen, Arbeiten und für das WLAN. Für das Ausleihen brauchst du meist einen Ausweis, der oft kostenlos ist.",
      },
      {
        q: "Werden Öffnungszeiten angezeigt?",
        a: "Wo jemand sie erfasst hat, stehen sie in den Details des Punkts. Bei Zweigstellen und Fahrbibliotheken sind sie lückenhafter als bei der Hauptbibliothek, ein Blick auf die Seite der Bibliothek lohnt sich vor einer weiten Anfahrt.",
      },
      {
        q: "Was ist ein offener Bücherschrank?",
        a: "Ein Schrank oder Regal im Straßenraum, aus dem jeder ein Buch nehmen und eines hineinstellen kann. Sie sind hier neben den richtigen Bibliotheken enthalten und gehören zu den Dingen, die außerhalb von OpenStreetMap so gut wie nicht auffindbar sind.",
      },
    ],
  },

  "outdoor-gyms": {
    plural: "Outdoor-Fitnessgeräte",
    singular: "Outdoor-Fitnessgerät",
    heading: "Outdoor-Fitness",
    intro: {
      one: "Rund um {city} ist eine Outdoor-Fitnessstation verzeichnet: frei zugängliche Geräte im Freien, in einem Park oder an einer Laufstrecke, etwa eine Calisthenics-Anlage oder ein Trimm-dich-Pfad.",
      other:
        "Rund um {city} sind {count} Outdoor-Fitnessstationen verzeichnet: die frei zugänglichen Geräte im Freien in Parks und an Laufstrecken, einschließlich Calisthenics-Anlagen und Trimm-dich-Pfaden.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} draußen trainieren?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Fitnessstation. Solche Anlagen sind fast immer kostenlos und rund um die Uhr zugänglich.",
          other:
            "Die Karte zeigt {count} verzeichnete Fitnessstationen. Sie sind fast immer kostenlos und rund um die Uhr zugänglich.",
        },
      },
      {
        q: "Welche Geräte gibt es dort?",
        a: "Wo jemand sie erfasst hat, stehen die Geräte in den Details des Punkts. Meist ist nur der Standort erfasst, also rechne mit einer Überraschung in beide Richtungen.",
      },
    ],
  },

  "camp-sites": {
    plural: "Campingplätze",
    singular: "Campingplatz",
    heading: "Campingplätze",
    intro: {
      one: "Rund um {city} ist ein Camping- oder Wohnmobilplatz verzeichnet, entweder ein kommerzieller Platz, ein Stellplatz oder ein einfacher Zeltplatz, den nur eine Erfassung vor Ort festhält.",
      other:
        "Rund um {city} sind {count} Camping- und Wohnmobilplätze verzeichnet, von kommerziellen Plätzen und Stellplätzen bis zu den einfachen Zeltplätzen, die nur eine Erfassung vor Ort festhält.",
    },
    faq: [
      {
        q: "Wo kann ich in der Nähe von {city} campen?",
        a: {
          one: 'Die Karte zeigt einen verzeichneten Camping- oder Wohnmobilplatz. Kombiniere ihn mit der Zusammenstellung "Camping" mit Schutzhütten, Trinkwasser und Toiletten.',
          other:
            'Die Karte zeigt {count} verzeichnete Camping- und Wohnmobilplätze. Kombiniere sie mit der Zusammenstellung "Camping" mit Schutzhütten, Trinkwasser und Toiletten.',
        },
      },
      {
        q: "Muss ich vorher reservieren?",
        a: "Auf kommerziellen Plätzen in der Hochsaison ja. Einfache Zeltplätze und Stellplätze arbeiten meist ohne Reservierung. OpenStreetMap führt keine Belegung.",
      },
      {
        q: "Ist Wildcampen erlaubt?",
        a: "Das regelt jedes Land anders, in Teilen Skandinaviens weitgehend, in Mitteleuropa fast nirgends. Diese Karte zeigt erfasste Plätze, sie ist keine Auskunft über die Rechtslage.",
      },
    ],
  },

  shelters: {
    plural: "Schutzhütten",
    singular: "Schutzhütte",
    heading: "Schutzhütten",
    intro: {
      one: "Rund um {city} ist eine Schutzhütte, ein Unterstand oder eine Berghütte verzeichnet. Das sind die Bauten am Weg, um die herum man eine Wanderung plant, und auf kommerziellen Karten sind sie so gut wie nicht zu finden.",
      other:
        "Rund um {city} sind {count} Schutzhütten, Unterstände, Wildnishütten und Berghütten verzeichnet. Das sind die Bauten am Weg, um die herum man eine Wanderung plant, und auf kommerziellen Karten sind sie so gut wie nicht zu finden.",
    },
    faq: [
      {
        q: "Wo finde ich eine Schutzhütte in der Nähe von {city}?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Hütte, die ein Unterstand, eine Wetterschutzhütte, eine offene Wildnishütte oder eine Berghütte sein kann.",
          other:
            "Die Karte zeigt {count} verzeichnete Hütten und Unterstände, darunter Wetterschutzhütten, offene Wildnishütten und Berghütten.",
        },
      },
      {
        q: "Kann ich sie kostenlos nutzen?",
        a: "Offene Wildnishütten und Unterstände am Weg sind frei zugänglich, und in Skandinavien und im Baltikum darf man in vielen auch übernachten. Bewirtschaftete Berghütten verlangen Geld und wollen eine Reservierung.",
      },
      {
        q: "Darf ich dort ein Feuer machen?",
        a: "An Hütten mit einer angelegten Feuerstelle in aller Regel ja, sonst nicht. Regionale Waldbrandverbote bei Trockenheit stechen das, und an gepflegten Wildnisplätzen liegt oft Holz im Schuppen daneben.",
      },
      {
        q: "Warum sind Bushaltestellen nicht dabei?",
        a: "Weil ein Unterstand hier nur nützt, wenn man weiß, was er ist. Gezeigt werden Punkte, die ihren Typ als Hütte, Unterstand, Picknick- oder Wetterschutz angeben; die ohne Typangabe sind in der Stadt fast immer Bushaltestellen und würden jede andere Hütte unter sich begraben.",
      },
    ],
  },

  "rest-areas": {
    plural: "Rastplätze",
    singular: "Rastplatz",
    heading: "Rastplätze",
    intro: {
      one: "Rund um {city} ist ein Rastplatz verzeichnet: eine Haltebucht, ein Rastplatz an einer Hauptstraße oder eine vollständige Raststätte mit Tankstelle und Gebäude, wo es auf einer langen Fahrt tatsächlich Toiletten und eine Pause gibt.",
      other:
        "Rund um {city} sind {count} Rastplätze und Raststätten verzeichnet: die Haltebuchten und Rastplätze an Hauptstraßen und die vollständigen Raststätten mit Tankstelle und Gebäude, wo es auf einer langen Fahrt tatsächlich Toiletten und eine Pause gibt.",
    },
    faq: [
      {
        q: "Wo ist der nächste Rastplatz bei {city}?",
        a: {
          one: 'Die Karte zeigt einen verzeichneten Rastplatz. Die Zusammenstellung "Autoreise" kombiniert ihn mit Tanken, Laden und Toiletten, was beim Fahren die nützlichere Ansicht ist.',
          other:
            'Die Karte zeigt {count} verzeichnete Rastplätze und Raststätten. Die Zusammenstellung "Autoreise" kombiniert sie mit Tanken, Laden und Toiletten, was beim Fahren die nützlichere Ansicht ist.',
        },
      },
      {
        q: "Gibt es dort Toiletten?",
        a: "An Raststätten ja, an einfachen Haltebuchten oft nicht. Schalte die Kategorie Toiletten dazu, dann siehst du, welche eine erfasste Toilette haben.",
      },
      {
        q: "Darf ich dort im Auto übernachten?",
        a: "Auf Rastplätzen an Autobahnen ist eine Pause zum Ausruhen fast überall erlaubt, mehrere Nächte meist nicht. Die Regeln sind örtlich, und diese Karte gibt darüber keine Auskunft.",
      },
    ],
  },

  "dump-stations": {
    plural: "Entsorgungsstationen",
    singular: "Entsorgungsstation",
    heading: "Entsorgungsstationen",
    intro: {
      one: "Rund um {city} ist eine Ver- und Entsorgungsstation verzeichnet, an der ein Wohnmobil seine Abwassertanks leeren kann. Eine Kategorie, die kaum eine gängige Karte abdeckt, und eine harte Voraussetzung, wenn du im Fahrzeug lebst.",
      other:
        "Rund um {city} sind {count} Ver- und Entsorgungsstationen verzeichnet, an denen ein Wohnmobil seine Abwassertanks leeren kann. Eine Kategorie, die kaum eine gängige Karte abdeckt, und eine harte Voraussetzung, wenn du im Fahrzeug lebst.",
    },
    faq: [
      {
        q: "Wo kann ich bei {city} die Tanks meines Wohnmobils leeren?",
        a: {
          one: 'Die Karte zeigt eine verzeichnete Entsorgungsstation. Die Zusammenstellung "Vanlife" ergänzt Trinkwasser, Toiletten, Parken und Recycling daneben.',
          other:
            'Die Karte zeigt {count} verzeichnete Entsorgungsstationen. Die Zusammenstellung "Vanlife" ergänzt Trinkwasser, Toiletten, Parken und Recycling daneben.',
        },
      },
      {
        q: "Kostet das etwas?",
        a: "Auf Campingplätzen ist es oft im Preis enthalten, an eigenständigen Stationen wird meist eine kleine Gebühr fällig. Wo OpenStreetMap sie erfasst hat, steht sie am Punkt.",
      },
    ],
  },

  "post-offices": {
    plural: "Postfilialen",
    singular: "Postfiliale",
    heading: "Postfilialen",
    intro: {
      one: "In {city} ist eine Postfiliale verzeichnet, die auch ein Schalter in einem Supermarkt oder Kiosk sein kann, der den Postdienst anbietet, ohne von der Straße aus wie eine Post auszusehen. Wo die Daten es hergeben, bekommst du zusätzlich Öffnungszeiten und ob der Eingang stufenlos ist.",
      other:
        "In {city} sind {count} Postfilialen verzeichnet, einschließlich der Schalter in Supermärkten und Kiosken, die den Postdienst anbieten, ohne von der Straße aus wie eine Post auszusehen. Wo die Daten es hergeben, bekommst du zusätzlich Öffnungszeiten und ob der Eingang stufenlos ist.",
    },
    faq: [
      {
        q: "Wo ist die nächste Postfiliale in {city}?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Postfiliale. Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich. Tippe auf die Markierung für die Öffnungszeiten, sofern jemand sie erfasst hat, und den Fußweg dorthin.",
          other:
            "Die Karte zeigt {count} verzeichnete Postfilialen. Erlaube den Standortzugriff, dann zentriert sich die Karte auf dich mit den nächstgelegenen ringsum. Tippe auf eine Markierung für die Öffnungszeiten, sofern jemand sie erfasst hat, und den Fußweg dorthin.",
        },
      },
      {
        q: "Kann ich dort Pakete abgeben?",
        a: "In der Regel ja, das ist der Grund, aus dem die meisten Menschen hingehen. Welche Dienste eine Filiale genau anbietet, hält OpenStreetMap nicht fest.",
      },
      {
        q: "Sind Packstationen und Paketshops dabei?",
        a: "Nur wo sie als Postfiliale erfasst sind. Automatenstationen sind in OpenStreetMap eine eigene Kategorie und hier nicht durchgängig enthalten.",
      },
    ],
  },

  showers: {
    plural: "öffentliche Duschen",
    singular: "öffentliche Dusche",
    heading: "Duschen",
    intro: {
      one: "In und um {city} ist eine öffentliche Dusche verzeichnet: an einem Strand oder Freibad, auf einem Camping- oder Bootsplatz, oder in einer Sportanlage, die jeden hereinlässt. Eine Kategorie, um die sich kaum eine gängige Karte kümmert, und genau die, die du nach einer langen Fahrt oder einem Bad suchst.",
      other:
        "In und um {city} sind {count} öffentliche Duschen verzeichnet: die an Stränden und Freibädern, auf Camping- und Bootsplätzen, und in den Sportanlagen, die jeden hereinlassen. Eine Kategorie, um die sich kaum eine gängige Karte kümmert, und genau die, die du nach einer langen Fahrt oder einem Bad suchst.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} duschen?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Dusche. Duschen an Stränden und Bädern sind meist kalt und im Freien, die auf Camping- und Bootsplätzen geschlossen und oft warm, ein Blick auf die Markierung lohnt sich also vor der Anfahrt.",
          other:
            "Die Karte zeigt {count} verzeichnete Duschen. Duschen an Stränden und Bädern sind meist kalt und im Freien, die auf Camping- und Bootsplätzen geschlossen und oft warm, ein Blick auf die Markierung lohnt sich also vor der Anfahrt.",
        },
      },
      {
        q: "Kostet das etwas?",
        a: "Strand- und Freibadduschen sind fast immer kostenlos. Auf Camping- und Bootsplätzen wird oft eine kleine Gebühr oder eine Münze fällig, und wo OpenStreetMap sie erfasst hat, steht sie am Punkt.",
      },
      {
        q: "Sind es Duschen mit warmem Wasser?",
        a: "Wo jemand es erfasst hat, steht es in den Details. Im Zweifel: draußen kalt, drinnen warm.",
      },
    ],
  },

  fireplaces: {
    plural: "Feuerstellen und Grillplätze",
    singular: "Feuerstelle oder Grillplatz",
    heading: "Feuerstellen und Grill",
    intro: {
      one: "Rund um {city} ist eine öffentliche Feuerstelle oder ein Grillplatz verzeichnet: ein Feuerring an einer Wanderhütte, ein gemauerter Grill im Park oder eine gepflegte Kochstelle am Weg. Genau die Art Einrichtung, die eine Erfassung vor Ort festhält und eine kommerzielle Karte nie.",
      other:
        "Rund um {city} sind {count} öffentliche Feuerstellen und Grillplätze verzeichnet: die Feuerringe an Wanderhütten, die gemauerten Grills in Parks und die gepflegten Kochstellen an Wegen. Genau die Art Einrichtung, die eine Erfassung vor Ort festhält und eine kommerzielle Karte nie.",
    },
    faq: [
      {
        q: "Wo darf ich bei {city} grillen oder ein Feuer machen?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Feuerstelle oder einen Grillplatz. Oft liegt so eine Stelle neben einer Hütte oder einem Picknickplatz, mit diesen Kategorien zusammen siehst du den ganzen Rastplatz statt nur den Feuerring.",
          other:
            "Die Karte zeigt {count} verzeichnete Feuerstellen und Grillplätze. Viele liegen neben einer Hütte oder einem Picknickplatz, mit diesen Kategorien zusammen siehst du den ganzen Rastplatz statt nur den Feuerring.",
        },
      },
      {
        q: "Darf ich dort heute ein Feuer anzünden?",
        a: "Eine verzeichnete Feuerstelle heißt, dass der Bau existiert, nicht dass ein Feuer heute erlaubt ist. Regionale Waldbrandverbote bei Trockenheit stechen alles, und in manchen Ländern werden sie täglich ausgerufen. Prüfe die örtliche Lage, bevor du ein Streichholz anzündest.",
      },
      {
        q: "Gibt es dort Feuerholz?",
        a: "An gepflegten Wildnisplätzen in Skandinavien und den Alpen oft ja, in einem Holzschuppen neben der Feuerstelle. Anderswo geh nicht davon aus. OpenStreetMap hält es selten fest.",
      },
    ],
  },

  "compressed-air": {
    plural: "Druckluftstationen",
    singular: "Druckluftstation",
    heading: "Druckluft",
    intro: {
      one: "In {city} ist eine Stelle zum Aufpumpen eines Reifens verzeichnet: eine Druckluftstation an einer Tankstelle oder einem Parkplatz, oder eine öffentliche Pumpe für Fahrräder. Meist kostenlos, meist unbeschildert und anderswo kaum zu suchen.",
      other:
        "In {city} sind {count} Stellen zum Aufpumpen eines Reifens verzeichnet: die Druckluftstationen an Tankstellen und Parkplätzen und die öffentlichen Pumpen, die Radfahrende nutzen können. Meist kostenlos, meist unbeschildert und anderswo kaum zu suchen.",
    },
    faq: [
      {
        q: "Wo kann ich in {city} Reifen aufpumpen?",
        a: {
          one: "Die Karte zeigt eine verzeichnete Druckluftstation. Die meisten stehen an Tankstellen, am Rand des Geländes, wo das Schild von der Straße aus leicht zu übersehen ist.",
          other:
            "Die Karte zeigt {count} verzeichnete Druckluftstationen. Die meisten stehen an Tankstellen, am Rand des Geländes, wo das Schild von der Straße aus leicht zu übersehen ist.",
        },
      },
      {
        q: "Kostet Druckluft etwas?",
        a: "An vielen Tankstellen ist sie kostenlos, an manchen wird eine Münze fällig. Wo OpenStreetMap eine Gebühr erfasst hat, steht sie am Punkt.",
      },
      {
        q: "Kann ich damit auch Fahrradreifen aufpumpen?",
        a: "Autodruckluft passt auf Autoventile, für Fahrräder brauchst du oft einen Adapter. Öffentliche Fahrradpumpen sind hier ebenfalls enthalten und dafür die bessere Wahl.",
      },
    ],
  },

  benches: {
    plural: "Sitzbänke",
    singular: "Sitzbank",
    heading: "Sitzbänke",
    intro: {
      one: "In {city} ist eine öffentliche Sitzbank verzeichnet. Wenn du mit einem schlechten Knie, einem kleinen Kind oder einer schweren Tasche unterwegs bist, ändert das Wissen, wo die nächste Sitzgelegenheit ist, deine Route.",
      other:
        "In {city} sind {count} öffentliche Sitzbänke verzeichnet. Es ist die größte Kategorie hier und die stillste nützliche: Wenn du mit einem schlechten Knie, einem kleinen Kind oder einer schweren Tasche unterwegs bist, ändert das Wissen, wo die nächste Sitzgelegenheit ist, deine Route.",
    },
    faq: [
      {
        q: "Wo gibt es in {city} eine Sitzbank?",
        a: {
          one: "Die Karte zeigt die eine verzeichnete Bank. Parks, Promenaden und Haltestellen sind die Orte, an denen sie sich häufen.",
          other:
            "Die Karte zeigt {count} verzeichnete Bänke, zusammengefasst, bis du weit genug hineinzoomst, dass sie sich trennen. Parks, Promenaden und Haltestellen sind die Orte, an denen sie sich häufen.",
        },
      },
      {
        q: "Haben die Bänke eine Rückenlehne?",
        a: "Wo jemand es erfasst hat, steht es in den Details des Punkts. Für viele Menschen ist das der Unterschied zwischen einer nutzbaren Bank und einer, an der man vorbeigeht, und es ist ein Tag, den zu erfassen sich lohnt.",
      },
      {
        q: "Sind das alle Bänke in {city}?",
        a: "Nein, und in keiner Stadt. Bänke gehören zu den zuletzt erfassten Dingen, weil es sehr viele davon gibt. Gut kartierte Innenstädte sind nahezu vollständig, Randlagen selten.",
      },
    ],
  },
};

/** Questions that hold for every category, appended after the specific ones */
export const deCommonFaq = [
  {
    q: "Woher stammen diese Daten?",
    a: "Von OpenStreetMap, einer Karte, die von freiwilligen Erfassenden gebaut und laufend gepflegt wird. Für kleine Einrichtungen wie diese ist sie die beste verfügbare Quelle, weil es genau die Dinge sind, die kommerzielle Kartenanbieter nicht erheben.",
  },
  {
    q: "Etwas fehlt oder ist falsch. Kann ich das korrigieren?",
    a: "Ja, und es ist der schnellste Weg. Bearbeite den Punkt auf openstreetmap.org, und die Änderung fließt bei der nächsten Aktualisierung auf diese Seite. Es gibt hier keine getrennte Datenbank, die zu korrigieren wäre.",
  },
  {
    q: "Sind {plural} in {city} vollständig erfasst?",
    a: "So vollständig wie die Erfassung vor Ort. Dicht kartierte Städte sind nahezu erschöpfend, anderswo ist mit Lücken zu rechnen. Die Karte ist immer die vollständigere Ansicht, weil die Liste auf dieser Seite nur die Punkte nennt, die einen Namen tragen.",
  },
];
