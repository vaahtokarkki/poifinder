/**
 * The Finnish page copy: the intro and the questions for every category.
 *
 * Written, not translated, and shaped by two things Finnish does that English
 * does not.
 *
 * The city is inflected, so these say `{cityIn}` — "Helsingissä" — wherever
 * English says "in {city}". See CityName in seo/cities.ts.
 *
 * A count takes the partitive, and the partitive of every noun is different:
 * "298 vessaa", "10 kirjastoa", "56 penkkiä". There is no placeholder for it
 * and there should not be — the noun after a number is written into each
 * category's own sentence, which is prose anyway. What must never appear is
 * `{count} {noun}`: that would put the stored nominative behind a number and
 * produce "298 vessat".
 *
 * NOT YET REVIEWED BY A NATIVE SPEAKER.
 */
import type { CategoryCopy } from "./types";

type Prose = Pick<CategoryCopy, "intro" | "faq">;

export const fiProse: Record<string, Prose> = {
  toilets: {
    intro: {
      one: "{cityIn} on kartoitettu yksi yleinen vessa. Sikäli kuin tiedot kertovat, näet myös aukioloajat, mahdollisen maksun ja onko sinne esteetön pääsy.",
      other:
        "{cityIn} on kartoitettu {count} yleistä vessaa. Alla oleva lista kattaa ne, joilla on OpenStreetMapissa nimi; kartalla näkyvät kaikki, myös nimettömät katuvessat sekä puistoissa, asemilla ja kauppakeskuksissa olevat. Sikäli kuin tiedot kertovat, saat lisäksi aukioloajat, tiedon maksusta ja siitä onko pääsy esteetön.",
    },
    faq: [
      {
        q: "Mistä löydän yleisen vessan {cityIn}?",
        a: {
          one: "Avaa yllä oleva kartta, se keskittyy {cityIn} ja näyttää sen yhden kartoitetun vessan. Napauta merkkiä nähdäksesi tarkan sijainnin, aukioloajat kun ne tiedetään, ja kävelyreitin. Jos sallit sijainnin käytön, kartta seuraa sinua, mikä on nopeampaa kun olet jo liikkeellä.",
          other:
            "Avaa yllä oleva kartta, se keskittyy {cityIn} ja näyttää kaikki {count} kartoitettua vessaa. Napauta merkkiä nähdäksesi tarkan sijainnin, aukioloajat kun ne tiedetään, ja kävelyreitin. Jos sallit sijainnin käytön, kartta seuraa sinua, mikä on nopeampaa kun olet jo liikkeellä.",
        },
      },
      {
        q: "Ovatko yleiset vessat {cityIn} maksuttomia?",
        a: "Se vaihtelee kaupungeittain ja vessoittain. Jos OpenStreetMapissa on tieto maksusta, se näkyy pisteen kohdalla. Todennäköisimmin maksullisia ovat asemien ja kauppakeskusten vessat; kaupungin katuvessat ja puistovessat ovat yleensä maksuttomia.",
      },
      {
        q: "Onko {cityIn} esteettömiä vessoja?",
        a: "On. Pisteet, jotka on OpenStreetMapissa merkitty esteettömiksi, näyttävät sen tiedoissaan. Merkintä on epätasaisesti ylläpidetty, joten vessa ilman merkintää ei välttämättä ole esteetön eikä esteellinen — sitä ei vain ole kartoitettu.",
      },
      {
        q: "Miksi joillakin vessoilla ei näy aukioloaikoja?",
        a: "Aukioloajat ovat OpenStreetMapissa vapaaehtoinen tieto, ja moni kartoittaja merkitsee vain sijainnin. Puuttuva tieto tarkoittaa, ettei kukaan ole käynyt tarkistamassa, ei sitä että paikka olisi auki ympäri vuorokauden.",
      },
    ],
  },

  "drinking-water": {
    intro: {
      one: "{cityIn} on kartoitettu yksi paikka, jossa voi täyttää pullon. Juomakelvottomiksi merkityt pisteet on suodatettu pois, joten näkemäsi vesi on juotavaa.",
      other:
        "{cityIn} on kartoitettu {count} paikkaa, joissa voi täyttää pullon: yleisiä vesipostijä, vesipisteitä, kaivoja ja lähteitä, joiden vesi on varmistettu juomakelpoiseksi. Juomakelvottomiksi merkityt pisteet on suodatettu pois, joten näkemäsi vesi on juotavaa.",
    },
    faq: [
      {
        q: "Mistä voin täyttää vesipullon {cityIn}?",
        a: {
          one: "Kartta näyttää sen yhden kartoitetun juomavesipisteen {cityIn}. Napauta merkkiä nähdäksesi reitin.",
          other:
            "Kartta näyttää kaikki {count} kartoitettua juomavesipistettä {cityIn}, useimmat niistä puistoissa, aukioilla ja kävelyreittien varrella. Napauta merkkiä nähdäksesi reitin.",
        },
      },
      {
        q: "Onko näiden vesipisteiden vesi juomakelpoista?",
        a: "Jokainen tässä näkyvä piste on OpenStreetMapissa merkitty juomavedeksi, ja nimenomaan juomakelvottomiksi merkityt lähteet on jätetty pois. Vesipisteet voivat silti olla kausiluonteisia, joten kylmissä maissa moni on talvella suljettu.",
      },
      {
        q: "Ovatko juomavesipisteet {cityIn} käytössä ympäri vuoden?",
        a: "Pakkasalueilla ulkona olevat vesipisteet tyhjennetään ja suljetaan yleensä syksystä kevääseen, ettei putkia rikkoisi. Kartta ei seuraa kausisulkuja, joten talvella tuloksia kannattaa pitää suuntaa antavina.",
      },
    ],
  },

  playgrounds: {
    intro: {
      one: "{cityIn} on kartoitettu yksi leikkipuisto. Kartta näyttää sen riippumatta siitä, onko OpenStreetMapissa sille nimeä.",
      other:
        "{cityIn} on kartoitettu {count} leikkipuistoa. Lista nimeää ne, joille OpenStreetMapissa on nimi, yleensä suuremmat puistoleikkipaikat; kartta lisää niiden päälle jokaisen nimettömän lähipuiston.",
    },
    faq: [
      {
        q: "Kuinka monta leikkipuistoa {cityIn} on?",
        a: {
          one: "Yksi on tällä hetkellä kartoitettu OpenStreetMapiin tämän sivun kattamalla alueella. Siellä missä kartoitus on vielä ohutta, luku on alakanttiin, ja näin pienellä määrällä se on todennäköisin selitys.",
          other:
            "{count} on tällä hetkellä kartoitettu OpenStreetMapiin tämän sivun kattamalla alueella. Hyvin kartoitetuissa kaupungeissa luku on lähellä todellista, muualla alakanttiin.",
        },
      },
      {
        q: "Mikä leikkipuisto on lähimpänä minua {cityIn}?",
        a: 'Salli sijainnin käyttö, niin kartta keskittyy sinuun ja lähimmät leikkipuistot ovat ympärilläsi. Voit myös yhdistää leikkipuistot vessoihin ja jäätelöön kokoelmalla "Perhe", mikä on retkipäivänä yleensä juuri se mitä tarvitaan.',
      },
      {
        q: "Kerrotaanko listassa mitä välineitä leikkipuistossa on?",
        a: "Vain jos joku on käynyt kartoittamassa ne. OpenStreetMapiin voi merkitä keinut, liukumäet, kiipeilytelineet ja ikäryhmän, mutta useimmilla pisteillä on vain sijainti ja joskus nimi.",
      },
    ],
  },

  parking: {
    intro: {
      one: "{cityIn} on kartoitettu yksi pysäköintialue, ja yksityiset sekä asukaspysäköintipaikat on suodatettu pois.",
      other:
        "{cityIn} on kartoitettu {count} pysäköintialuetta, ja yksityiset sekä asukaspysäköintipaikat on suodatettu pois. Mukana ovat kadunvarsipaikat, maantasoalueet ja pysäköintitalot.",
    },
    faq: [
      {
        q: "Mihin voin pysäköidä {cityIn}?",
        a: {
          one: "Kartta näyttää yhden yleisesti käytettävän pysäköintialueen. Nimenomaan yksityisiksi merkityt pisteet on jätetty pois, joten jäljelle jää pysäköinti, johon yleensä saa ajaa.",
          other:
            "Kartta näyttää {count} yleisesti käytettävää pysäköintialuetta. Nimenomaan yksityisiksi merkityt pisteet on jätetty pois, joten jäljelle jää pysäköinti, johon yleensä saa ajaa.",
        },
      },
      {
        q: "Näkyvätkö pysäköinnin hinnat?",
        a: "Vain siellä missä OpenStreetMapissa on niistä tieto, ja se on vähemmistö pisteistä. Käytä karttaa pysäköintipaikkojen löytämiseen ja tarkista hinta kyltistä tai operaattorin sivulta.",
      },
      {
        q: "Onko ilmainen pysäköinti merkitty erikseen?",
        a: "Siellä missä maksutieto on olemassa, se näkyy pisteen tiedoissa. Koska kattavuus on epätasainen, ilman merkintää oleva alue voi olla kumpi tahansa, joten se kannattaa tarkistaa paikan päällä.",
      },
    ],
  },

  "charging-stations": {
    intro: {
      one: "{cityIn} on kartoitettu yksi sähköauton latauspiste. OpenStreetMapissa on mukana myös operaattoreita, jotka suurista kaupallisista sovelluksista usein puuttuvat, erityisesti pienet kunnalliset ja hotellien latauspisteet.",
      other:
        "{cityIn} on kartoitettu {count} sähköauton latauspistettä, yksittäisistä kadunvarsipisteistä moottoritien pikalatureihin. OpenStreetMapissa on mukana myös operaattoreita, jotka suurista kaupallisista sovelluksista usein puuttuvat, erityisesti pienet kunnalliset ja hotellien latauspisteet.",
    },
    faq: [
      {
        q: "Missä voin ladata sähköauton {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun latauspisteen. Napauta sitä nähdäksesi sijainnin ja sen, mitä kartoituksessa on merkitty liittimistä ja operaattorista.",
          other:
            "Kartta näyttää {count} kartoitettua latauspistettä. Napauta yhtä nähdäksesi sijainnin ja sen, mitä kartoituksessa on merkitty liittimistä ja operaattorista.",
        },
      },
      {
        q: "Näkyykö tästä onko latauspiste juuri nyt vapaa?",
        a: "Ei. OpenStreetMap on kartta siitä mitä on olemassa, ei reaaliaikainen saatavuustieto. Ajantasaisen tilanteen näet edelleen operaattorin omasta sovelluksesta.",
      },
      {
        q: "Mitkä liitintyypit näytetään?",
        a: "Siellä missä joku on ne kartoittanut, liitintyypit näkyvät pisteen tiedoissa. Uusilla ja suurilla asemilla kattavuus on parempi kuin vanhoilla kadunvarsipisteillä.",
      },
    ],
  },

  "gas-stations": {
    intro: {
      one: "{cityIn} ja sen ympäristössä on kartoitettu yksi huoltoasema. OpenStreetMapissa ovat mukana myös merkittömät ja automaattiasemat, jotka ketjujen omista hauista usein puuttuvat.",
      other:
        "{cityIn} ja sen ympäristössä on kartoitettu {count} huoltoasemaa, mukaan lukien merkittömät ja automaattiasemat, jotka ketjujen omista hauista usein puuttuvat.",
    },
    faq: [
      {
        q: "Missä on lähin huoltoasema {cityIn}?",
        a: {
          one: "Salli sijainnin käyttö, niin kartta keskittyy sinuun ja näyttää sen yhden kartoitetun aseman, tai siirrä karttaa mihin tahansa ja hae sieltä.",
          other:
            "Salli sijainnin käyttö, niin kartta keskittyy sinuun ja lähimmät {count} kartoitetusta asemasta ovat ympärilläsi, tai siirrä karttaa mihin tahansa ja hae sieltä.",
        },
      },
      {
        q: "Näkyvätkö polttoaineen hinnat?",
        a: "Ei. Hinnat muuttuvat päivittäin eikä OpenStreetMap seuraa niitä. Tämä sivu on asemien löytämistä varten, erityisesti niiden joita ei muualta löydä.",
      },
      {
        q: "Ovatko kaasu- ja vetyasemat mukana?",
        a: "Ovat siellä missä ne on kartoitettu huoltoasemiksi. Tarjolla olevat polttoaineet ovat OpenStreetMapissa omia merkintöjään, joita ei kaikkialla ylläpidetä, joten tarkista asia ennen pitkää ajomatkaa.",
      },
    ],
  },

  "ice-cream": {
    intro: {
      one: "{cityIn} on kartoitettu yksi jäätelöpaikka, joka voi olla jäätelöbaari, gelateria tai kioski. Mukana ovat sekä varsinaiset jäätelöliikkeet että kahvilat, joiden päätuote on jäätelö.",
      other:
        "{cityIn} on kartoitettu {count} jäätelöpaikkaa: jäätelöbaareja, gelaterioita ja kioskeja, sekä kahviloita joiden päätuote on jäätelö.",
    },
    faq: [
      {
        q: "Mistä saan jäätelöä {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun paikan. Kausikioskit ovat mukana, joten jos kyse on sellaisesta, se on kesän ulkopuolella todennäköisesti kiinni.",
          other:
            "Kartta näyttää {count} kartoitettua paikkaa. Kausikioskit ovat mukana, joten osa niistä on kesän ulkopuolella kiinni.",
        },
      },
      {
        q: "Näkyvätkö aukioloajat?",
        a: "Siellä missä joku on ne kartoittanut, kyllä. Jäätelöpaikoilla ne ovat erityisen epäluotettavia, koska moni on auki vain kaudella ja ajat ovat kesällä ja talvella eri. Pidä niitä suuntaa antavina.",
      },
    ],
  },

  "dog-parks": {
    intro: {
      one: "{cityIn} on kartoitettu yksi aidattu koirapuisto tai vapaa-alue. Kyse on alueista, joilla koira saa juosta ilman hihnaa, erotuksena puistoista joihin koirat vain ovat sallittuja.",
      other:
        "{cityIn} on kartoitettu {count} aidattua koirapuistoa ja vapaa-aluetta. Kyse on alueista, joilla koira saa juosta ilman hihnaa, erotuksena puistoista joihin koirat vain ovat sallittuja.",
    },
    faq: [
      {
        q: "Missä koirani saa juosta vapaana {cityIn}?",
        a: {
          one: 'Kartta näyttää yhden kartoitetun koirapuiston tai vapaa-alueen. Yhdistä se kokoelmalla "Koiralenkki" juomaveteen ja vessoihin koko lenkkiä varten.',
          other:
            'Kartta näyttää {count} kartoitettua koirapuistoa ja vapaa-aluetta. Yhdistä ne kokoelmalla "Koiralenkki" juomaveteen ja vessoihin koko lenkkiä varten.',
        },
      },
      {
        q: "Ovatko alueet aidattuja?",
        a: "Osa on. OpenStreetMapiin voi merkitä aitauksen, mutta sitä ei tehdä kaikkialla. Jos koira ei tule kutsuttaessa varmasti takaisin, kannattaa katsoa pisteen tiedot ennen kuin päästät sen irti.",
      },
    ],
  },

  "picnic-spots": {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi eväspaikka, joka voi olla yksittäinen pöytä polun varrella tai rakennettu eväsalue useine pöytineen ja nuotiopaikkoineen.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} eväspaikkaa, yksittäisistä pöydistä polkujen varsilla rakennettuihin eväsalueisiin, joissa on useita pöytiä ja nuotiopaikka.",
    },
    faq: [
      {
        q: "Missä voin eväillä {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun eväspöydän tai -paikan, todennäköisimmin puistossa tai kävely- tai pyöräreitin varrella.",
          other:
            "Kartta näyttää {count} kartoitettua eväspöytää ja -paikkaa, useimmat niistä puistoissa sekä kävely- ja pyöräreittien varsilla.",
        },
      },
      {
        q: "Onko eväspaikoilla grillimahdollisuutta?",
        a: 'Vain siellä missä on erikseen nuotiopaikka tai grilli, ja silloinkin paikalliset tulentekokiellot pätevät. Ota kategoria "Nuotiopaikat ja grillit" mukaan nähdäksesi missä sellainen on.',
      },
    ],
  },

  viewpoints: {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi näköalapaikka: merkitty kohta, jossa näkymä on koko pointti, olipa se näkötorni, terassi, lintutorni tai merkitsemätön harjanne jonka joku on käynyt kartoittamassa.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} näköalapaikkaa: merkittyjä kohtia joissa näkymä on koko pointti, näkötorneista ja terasseista lintutorneihin ja merkitsemättömiin harjanteisiin joita paikalliset ovat kartoittaneet.",
    },
    faq: [
      {
        q: "Mistä on parhaat näköalat {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun näköalapaikan. OpenStreetMap ei arvostele niitä, joten hyöty on siinä että löydät ne joita ei mainita missään oppaassa, ei siinä kuuluisassa terassissa jonka kaikki jo tuntevat.",
          other:
            "Kartta näyttää {count} kartoitettua näköalapaikkaa. OpenStreetMap ei arvostele niitä, joten hyöty on siinä että löydät ne joita ei mainita missään oppaassa, ei niissä kuuluisissa terasseissa jotka kaikki jo tuntevat.",
        },
      },
      {
        q: "Maksaako pääsy mitään?",
        a: "Useimmat ovat vapaasti käytettävissä. Näkötornit ja rakennusten katutasot pyytävät joskus pääsymaksun, ja siellä missä OpenStreetMapissa on maksutieto, se näkyy pisteen kohdalla.",
      },
    ],
  },

  beaches: {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi ranta tai virallinen uimapaikka, ja mukana ovat järvi- ja jokiuimapaikat siinä missä merenranta.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} rantaa ja virallista uimapaikkaa, järvillä ja joilla siinä missä merenrannalla.",
    },
    faq: [
      {
        q: "Missä voin uida {cityIn}?",
        a: {
          one: 'Kartta näyttää yhden kartoitetun rannan tai uimapaikan. Yhdistä se kokoelmalla "Perhe" vessoihin, pysäköintiin ja jäätelöön.',
          other:
            'Kartta näyttää {count} kartoitettua rantaa ja uimapaikkaa. Yhdistä ne kokoelmalla "Perhe" vessoihin, pysäköintiin ja jäätelöön.',
        },
      },
      {
        q: "Onko vesi puhdasta?",
        a: "Tämä kartta ei kerro sitä. Uimaveden laatua mittaavat viranomaiset ja tulokset julkaistaan kausittain; OpenStreetMap ei seuraa niitä. Ajantasaisen luokituksen näet paikalliselta taholta.",
      },
    ],
  },

  atms: {
    intro: {
      one: "{cityIn} on kartoitettu yksi pankkiautomaatti, joko erillinen tai pankin tai kaupan sisällä.",
      other:
        "{cityIn} on kartoitettu {count} pankkiautomaattia, sekä erillisiä että pankkien ja kauppojen sisällä olevia.",
    },
    faq: [
      {
        q: "Missä on lähin pankkiautomaatti {cityIn}?",
        a: {
          one: "Salli sijainnin käyttö, niin kartta keskittyy sinuun ja näyttää sen yhden kartoitetun automaatin.",
          other:
            "Salli sijainnin käyttö, niin kartta keskittyy sinuun ja lähimmät {count} kartoitetusta automaatista ovat ympärilläsi.",
        },
      },
      {
        q: "Peritäänkö automaateista maksua?",
        a: "Se riippuu omasta pankistasi ja automaatin operaattorista. OpenStreetMapissa on joskus operaattoritieto, mikä on vihje mutta ei tieto siitä mitä sinulta veloitetaan.",
      },
    ],
  },

  "post-boxes": {
    intro: {
      one: "{cityIn} on kartoitettu yksi postilaatikko. Kadulla olevat postilaatikot ovat juuri sellaisia pieniä rakenteita, jotka yleiskäyttöiset karttasovellukset ohittavat ja jotka OpenStreetMap kartoittaa perusteellisesti.",
      other:
        "{cityIn} on kartoitettu {count} postilaatikkoa. Kadulla olevat postilaatikot ovat juuri sellaisia pieniä rakenteita, jotka yleiskäyttöiset karttasovellukset ohittavat ja jotka OpenStreetMap kartoittaa perusteellisesti.",
    },
    faq: [
      {
        q: "Missä on lähin postilaatikko {cityIn}?",
        a: {
          one: "Kartta näyttää sen yhden kartoitetun postilaatikon. Tämä on niitä kategorioita, joissa OpenStreetMap on selvästi parempi lähde, koska tavalliset karttasovellukset harvoin listaavat yksittäisiä laatikoita.",
          other:
            "Kartta näyttää kaikki {count} kartoitettua postilaatikkoa. Tämä on niitä kategorioita, joissa OpenStreetMap on selvästi parempi lähde, koska tavalliset karttasovellukset harvoin listaavat yksittäisiä laatikoita.",
        },
      },
      {
        q: "Näkyvätkö tyhjennysajat?",
        a: "Siellä missä joku on ne kartoittanut, ne näkyvät pisteen tiedoissa. Ne on kartoitettu harvemmin kuin sijainti itse, ja laatikon kyljestä ne näkee luotettavammin.",
      },
    ],
  },

  recycling: {
    intro: {
      one: "{cityIn} on kartoitettu yksi kierrätyspiste, joka voi olla yksittäinen lasinkeräysastia kadunkulmassa tai kokonainen kierrätyskeskus.",
      other:
        "{cityIn} on kartoitettu {count} kierrätyspistettä, yksittäisistä lasinkeräysastioista kadunkulmissa kokonaisiin kierrätyskeskuksiin.",
    },
    faq: [
      {
        q: "Mihin voin viedä lasin tai pahvin {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun kierrätyspisteen. Napauta sitä nähdäksesi mitä materiaaleja siihen on merkitty.",
          other:
            "Kartta näyttää {count} kartoitettua kierrätyspistettä. Napauta yhtä nähdäksesi mitä materiaaleja siihen on merkitty.",
        },
      },
      {
        q: "Mitä materiaaleja otetaan vastaan?",
        a: "Siellä missä joku on ne kartoittanut, materiaalit näkyvät pisteen tiedoissa: lasi, paperi, pakkaukset, tekstiilit, sähkölaitteet. Kadulla olevat astiat ottavat yleensä vain yhtä tai kahta.",
      },
    ],
  },

  "luggage-storage": {
    intro: {
      one: "{cityIn} on kartoitettu yksi säilytyslokerikko tai matkatavarasäilytys, todennäköisimmin asemalla, lentoasemalla tai matkakeskuksessa. Hyödyllinen sinä päivänä kun teet uloskirjautumisen mutta juna lähtee vasta illalla.",
      other:
        "{cityIn} on kartoitettu {count} säilytyslokerikkoa ja matkatavarasäilytystä, valtaosin asemilla, lentoasemilla ja matkakeskuksissa. Hyödyllisiä sinä päivänä kun teet uloskirjautumisen mutta juna lähtee vasta illalla.",
    },
    faq: [
      {
        q: "Mihin voin jättää tavarani {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun lokerikon tai säilytyksen. Useimmissa kaupungeissa päärautatieasema on luotettava vaihtoehto.",
          other:
            "Kartta näyttää {count} kartoitettua lokerikkoa ja säilytystä. Useimmissa kaupungeissa päärautatieasema on luotettava vaihtoehto.",
        },
      },
      {
        q: "Mitä säilytys maksaa?",
        a: "Hinnan asettaa kukin toimija itse, tavallisesti päivähinta lokeroa kohti. OpenStreetMapissa hinta on harvoin merkittynä, joten varaudu paikan päällä olevaan hinnastoon.",
      },
    ],
  },

  libraries: {
    intro: {
      one: "{cityIn} on kartoitettu yksi kirjasto, joka voi olla pääkirjasto, lähikirjasto, kirjastoauton pysäkki tai katukirjahylly. Sikäli kuin tiedot kertovat, saat lisäksi aukioloajat ja tiedon siitä onko rakennukseen esteetön pääsy.",
      other:
        "{cityIn} on kartoitettu {count} kirjastoa: pääkirjastosta lähikirjastoihin, kirjastoauton pysäkkeihin ja katukirjahyllyihin, joissa kirjoja vaihdetaan ilmaiseksi. Sikäli kuin tiedot kertovat, saat lisäksi aukioloajat ja tiedon siitä onko rakennukseen esteetön pääsy.",
    },
    faq: [
      {
        q: "Missä on lähin kirjasto {cityIn}?",
        a: {
          one: "Salli sijainnin käyttö, niin kartta keskittyy sinuun ja näyttää sen yhden kartoitetun kirjaston, tai siirrä karttaa mihin tahansa ja hae sieltä. Napauta merkkiä nähdäksesi sijainnin, aukioloajat kun ne tiedetään, ja kävelyreitin.",
          other:
            "Salli sijainnin käyttö, niin kartta keskittyy sinuun ja lähimmät {count} kartoitetusta kirjastosta ovat ympärilläsi, tai siirrä karttaa mihin tahansa ja hae sieltä. Napauta merkkiä nähdäksesi sijainnin, aukioloajat kun ne tiedetään, ja kävelyreitin.",
        },
      },
      {
        q: "Pääseekö sisään ilman kirjastokorttia?",
        a: "Yleisiin kirjastoihin pääsee käytännössä aina kuka tahansa lukemaan, työskentelemään ja käyttämään verkkoa. Lainaamiseen tarvitaan yleensä kortti, joka on usein maksuton.",
      },
      {
        q: "Näkyvätkö aukioloajat?",
        a: "Siellä missä joku on ne kartoittanut, ne näkyvät pisteen tiedoissa. Lähikirjastoilla ja kirjastoautoilla ne ovat puutteellisempia kuin pääkirjastolla, joten ennen pitkää matkaa kannattaa tarkistaa kirjaston omilta sivuilta.",
      },
      {
        q: "Mikä on katukirjahylly?",
        a: "Kadulla oleva kaappi tai hylly, josta kuka tahansa voi ottaa kirjan ja jättää toisen. Ne ovat mukana varsinaisten kirjastojen rinnalla, ja ne kuuluvat niihin asioihin joita OpenStreetMapin ulkopuolelta ei käytännössä löydä.",
      },
    ],
  },

  "outdoor-gyms": {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi ulkokuntoilupaikka: vapaasti käytettäviä välineitä ulkona, puistossa tai lenkkipolun varrella, vaikkapa temppuiluteline tai kuntorata.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} ulkokuntoilupaikkaa: vapaasti käytettäviä välineitä puistoissa ja lenkkipolkujen varsilla, mukaan lukien temppuilutelineet ja kuntoradat.",
    },
    faq: [
      {
        q: "Missä voin kuntoilla ulkona {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun kuntoilupaikan. Ne ovat lähes aina maksuttomia ja auki ympäri vuorokauden.",
          other:
            "Kartta näyttää {count} kartoitettua kuntoilupaikkaa. Ne ovat lähes aina maksuttomia ja auki ympäri vuorokauden.",
        },
      },
      {
        q: "Mitä välineitä siellä on?",
        a: "Siellä missä joku on ne kartoittanut, välineet näkyvät pisteen tiedoissa. Useimmiten merkittynä on vain sijainti, joten varaudu yllätykseen kumpaankin suuntaan.",
      },
    ],
  },

  "camp-sites": {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi leirintä- tai matkailuautopaikka, joka voi olla kaupallinen leirintäalue, matkailuautojen levähdyspaikka tai yksinkertainen telttapaikka jonka vain paikallinen kartoitus tuntee.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} leirintä- ja matkailuautopaikkaa, kaupallisista leirintäalueista ja matkailuautopaikoista niihin yksinkertaisiin telttapaikkoihin jotka vain paikallinen kartoitus tuntee.",
    },
    faq: [
      {
        q: "Missä voin leiriytyä {cityIn} lähellä?",
        a: {
          one: 'Kartta näyttää yhden kartoitetun leirintä- tai matkailuautopaikan. Yhdistä se kokoelmalla "Retkeily" laavuihin, juomaveteen ja vessoihin.',
          other:
            'Kartta näyttää {count} kartoitettua leirintä- ja matkailuautopaikkaa. Yhdistä ne kokoelmalla "Retkeily" laavuihin, juomaveteen ja vessoihin.',
        },
      },
      {
        q: "Pitääkö varata etukäteen?",
        a: "Kaupallisilla alueilla sesonkiaikaan kyllä. Yksinkertaiset teltta- ja matkailuautopaikat toimivat yleensä ilman varausta. OpenStreetMap ei seuraa täyttöastetta.",
      },
    ],
  },

  shelters: {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi laavu, kota tai autiotupa. Nämä ovat niitä reitin varren rakenteita, joiden ympärille retki suunnitellaan, ja kaupallisilta kartoilta niitä ei käytännössä löydä.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} laavua, kotaa ja autiotupaa. Nämä ovat niitä reitin varren rakenteita, joiden ympärille retki suunnitellaan, ja kaupallisilta kartoilta niitä ei käytännössä löydä.",
    },
    faq: [
      {
        q: "Mistä löydän laavun {cityIn} läheltä?",
        a: {
          one: "Kartta näyttää yhden kartoitetun rakenteen, joka voi olla laavu, kota, sääsuoja tai autiotupa.",
          other:
            "Kartta näyttää {count} kartoitettua laavua ja tupaa, mukaan lukien sääsuojat, avoimet autiotuvat ja tunturituvat.",
        },
      },
      {
        q: "Saanko yöpyä siellä?",
        a: "Avoimissa autiotuvissa ja laavuissa Suomessa ja Pohjoismaissa yleensä saa. Varaustuvat ja vartioidut tuvat vaativat varauksen, ja polun varren sääsuoja on suojautumista varten, ei nukkumiseen.",
      },
      {
        q: "Saanko tehdä tulet?",
        a: "Nuotiopaikallisilla tuvilla ja laavuilla pääsääntöisesti kyllä, muualla ei. Metsäpalovaroitus kumoaa tämän, ja huolletuilla erämaapaikoilla puita on usein liiterissä vieressä.",
      },
    ],
  },

  "rest-areas": {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi levähdysalue: levike, pysähdyspaikka pääväylän varrella tai kokonainen liikenneasema, jossa on huoltamo ja rakennus — eli se paikka jossa pitkällä ajomatkalla oikeasti on vessa ja tauko.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} levähdysaluetta ja liikenneasemaa: levikkeitä ja pysähdyspaikkoja pääväylien varsilla sekä kokonaisia liikenneasemia, joissa on huoltamo ja rakennus — eli ne paikat joissa pitkällä ajomatkalla oikeasti on vessa ja tauko.",
    },
    faq: [
      {
        q: "Missä on lähin levähdysalue {cityIn} lähellä?",
        a: {
          one: 'Kartta näyttää yhden kartoitetun levähdysalueen. Kokoelma "Automatka" yhdistää sen tankkaukseen, lataukseen ja vessoihin, mikä on ajaessa hyödyllisempi näkymä.',
          other:
            'Kartta näyttää {count} kartoitettua levähdysaluetta ja liikenneasemaa. Kokoelma "Automatka" yhdistää ne tankkaukseen, lataukseen ja vessoihin, mikä on ajaessa hyödyllisempi näkymä.',
        },
      },
      {
        q: "Onko siellä vessoja?",
        a: "Liikenneasemilla on, pelkillä levikkeillä usein ei. Ota kategoria vessat mukaan nähdäksesi missä on kartoitettu vessa.",
      },
    ],
  },

  "dump-stations": {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi jätevesipiste, jossa matkailuauto voi tyhjentää säiliönsä. Kategoria jota tuskin mikään yleiskäyttöinen kartta kattaa, ja ehdoton edellytys jos asut autossa.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} jätevesipistettä, joissa matkailuauto voi tyhjentää säiliönsä. Kategoria jota tuskin mikään yleiskäyttöinen kartta kattaa, ja ehdoton edellytys jos asut autossa.",
    },
    faq: [
      {
        q: "Missä voin tyhjentää matkailuauton säiliöt {cityIn} lähellä?",
        a: {
          one: 'Kartta näyttää yhden kartoitetun jätevesipisteen. Kokoelma "Matkailuauto" lisää viereen juomaveden, vessat, pysäköinnin ja kierrätyksen.',
          other:
            'Kartta näyttää {count} kartoitettua jätevesipistettä. Kokoelma "Matkailuauto" lisää viereen juomaveden, vessat, pysäköinnin ja kierrätyksen.',
        },
      },
      {
        q: "Maksaako se mitään?",
        a: "Leirintäalueilla se sisältyy usein hintaan, erillisillä pisteillä peritään yleensä pieni maksu. Siellä missä OpenStreetMapissa on maksutieto, se näkyy pisteen kohdalla.",
      },
    ],
  },

  "post-offices": {
    intro: {
      one: "{cityIn} on kartoitettu yksi posti, joka voi olla myös kaupan tai kioskin sisällä oleva palvelupiste, joka hoitaa postiasiat näyttämättä kadulle postilta. Sikäli kuin tiedot kertovat, saat lisäksi aukioloajat ja tiedon siitä onko sisäänkäynti esteetön.",
      other:
        "{cityIn} on kartoitettu {count} postia, mukaan lukien kauppojen ja kioskien palvelupisteet, jotka hoitavat postiasiat näyttämättä kadulle postilta. Sikäli kuin tiedot kertovat, saat lisäksi aukioloajat ja tiedon siitä onko sisäänkäynti esteetön.",
    },
    faq: [
      {
        q: "Missä on lähin posti {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun postin. Salli sijainnin käyttö, niin kartta keskittyy sinuun. Napauta merkkiä nähdäksesi aukioloajat, sikäli kuin joku on ne kartoittanut, ja kävelyreitin.",
          other:
            "Kartta näyttää {count} kartoitettua postia. Salli sijainnin käyttö, niin kartta keskittyy sinuun ja lähimmät ovat ympärilläsi. Napauta merkkiä nähdäksesi aukioloajat, sikäli kuin joku on ne kartoittanut, ja kävelyreitin.",
        },
      },
      {
        q: "Voinko jättää paketin sinne?",
        a: "Pääsääntöisesti kyllä, ja se on se syy jonka takia useimmat sinne menevät. Mitä palveluja yksittäinen piste tarkalleen tarjoaa, ei OpenStreetMapissa ole merkittynä.",
      },
    ],
  },

  showers: {
    intro: {
      one: "{cityIn} ja sen ympäristössä on kartoitettu yksi yleinen suihku: rannalla tai maauimalassa, leirintäalueella tai venesatamassa, tai liikuntapaikassa johon kuka tahansa pääsee. Kategoria josta tuskin mikään yleiskäyttöinen kartta välittää, ja juuri se jota etsit pitkän ajomatkan tai uinnin jälkeen.",
      other:
        "{cityIn} ja sen ympäristössä on kartoitettu {count} yleistä suihkua: rannoilla ja maauimaloissa, leirintäalueilla ja venesatamissa, sekä liikuntapaikoissa joihin kuka tahansa pääsee. Kategoria josta tuskin mikään yleiskäyttöinen kartta välittää, ja juuri se jota etsit pitkän ajomatkan tai uinnin jälkeen.",
    },
    faq: [
      {
        q: "Missä voin käydä suihkussa {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun suihkun. Rantojen ja uimaloiden suihkut ovat yleensä kylmiä ja ulkona, leirintäalueiden ja satamien suljettuja ja usein lämpimiä, joten merkki kannattaa katsoa ennen matkaa.",
          other:
            "Kartta näyttää {count} kartoitettua suihkua. Rantojen ja uimaloiden suihkut ovat yleensä kylmiä ja ulkona, leirintäalueiden ja satamien suljettuja ja usein lämpimiä, joten merkki kannattaa katsoa ennen matkaa.",
        },
      },
      {
        q: "Maksaako se mitään?",
        a: "Rantojen ja maauimaloiden suihkut ovat lähes aina maksuttomia. Leirintäalueilla ja satamissa peritään usein pieni maksu tai tarvitaan kolikko, ja siellä missä OpenStreetMapissa on maksutieto, se näkyy pisteen kohdalla.",
      },
    ],
  },

  fireplaces: {
    intro: {
      one: "{cityIn} ympäristössä on kartoitettu yksi yleinen nuotiopaikka tai grilli: tulisija retkeilylaavulla, muurattu grilli puistossa tai huollettu keittopaikka polun varrella. Juuri sellaisia rakenteita joita paikallinen kartoitus tuntee ja kaupallinen kartta ei koskaan.",
      other:
        "{cityIn} ympäristössä on kartoitettu {count} yleistä nuotiopaikkaa ja grilliä: tulisijoja retkeilylaavuilla, muurattuja grillejä puistoissa ja huollettuja keittopaikkoja polkujen varsilla. Juuri sellaisia rakenteita joita paikallinen kartoitus tuntee ja kaupallinen kartta ei koskaan.",
    },
    faq: [
      {
        q: "Missä saan grillata tai tehdä nuotion {cityIn} lähellä?",
        a: {
          one: "Kartta näyttää yhden kartoitetun nuotiopaikan tai grillin. Usein sellainen on laavun tai eväspaikan vieressä, joten näillä kategorioilla yhdessä näet koko taukopaikan etkä pelkkää tulisijaa.",
          other:
            "Kartta näyttää {count} kartoitettua nuotiopaikkaa ja grilliä. Moni niistä on laavun tai eväspaikan vieressä, joten näillä kategorioilla yhdessä näet koko taukopaikan etkä pelkkää tulisijaa.",
        },
      },
      {
        q: "Saanko sytyttää tulen tänään?",
        a: "Kartoitettu nuotiopaikka tarkoittaa että rakenne on olemassa, ei sitä että tulenteko on tänään sallittua. Metsäpalovaroitus kumoaa kaiken muun, ja se annetaan päivittäin. Tarkista voimassa oleva varoitus ennen kuin raapaiset tulitikkua.",
      },
      {
        q: "Onko paikalla polttopuita?",
        a: "Huolletuilla erämaapaikoilla Suomessa ja Pohjoismaissa usein on, liiterissä nuotiopaikan vieressä. Muualla älä oleta. OpenStreetMapissa asiaa ei juuri merkitä.",
      },
    ],
  },

  "bicycle-repair": {
    intro: {
      one: "{cityIn} on kartoitettu yksi yleinen pyöränhuoltopiste: teline jossa on työkalut ja yleensä pumppu, maksuton ja kadun varrella. Muualta pyörän korjausta hakemalla löytyy liikkeitä — tämä on se kiinteä teline kahden korttelin päässä jota mikään muu ei listaa.",
      other:
        "{cityIn} on kartoitettu {count} yleistä pyöränhuoltopistettä: telineitä joissa on työkalut ja yleensä pumppu, maksuttomia ja kadun varrella. Muualta pyörän korjausta hakemalla löytyy liikkeitä — nämä ovat ne kiinteät telineet joita mikään muu ei listaa.",
    },
    faq: [
      {
        q: "Missä voin korjata pyörän {cityIn}?",
        a: {
          one: "Kartta näyttää yhden kartoitetun huoltopisteen. Ne ovat useimmiten asemien edustoilla, kampuksilla, puistojen sisäänkäynneillä ja viitoitettujen pyöräreittien varrella.",
          other:
            "Kartta näyttää {count} kartoitettua huoltopistettä. Ne ovat useimmiten asemien edustoilla, kampuksilla, puistojen sisäänkäynneillä ja viitoitettujen pyöräreittien varrella.",
        },
      },
      {
        q: "Mitä työkaluja huoltopisteessä on?",
        a: "Yleensä kuusiokoloavaimet, ruuvitaltat ja rengasraudat vaijereissa, sekä teline johon pyörän voi ripustaa niin että molemmat renkaat irtoavat maasta. Useimmissa on pumppu. Valikoima vaihtelee toimittajittain eikä OpenStreetMap aina kerro sitä.",
      },
      {
        q: "Onko siinä pumppu?",
        a: "Huoltopisteessä yleensä on, ja monelle se on koko syy tulla paikalle. Tällä sivulla ovat mukana myös yleiset paineilmapisteet, jotka ovat enimmäkseen huoltoasemien pihoilla: ne täyttävät renkaan, mutta ohutventtiiliin tarvitaan yleensä sovitin eikä mittari ole tarkka maantiepyörän paineilla. Varsinainen huoltopiste on parempi vaihtoehto siellä missä sellainen on.",
      },
      {
        q: "Ovatko ne maksuttomia?",
        a: "Käytännössä aina. Ne ovat kaupunkien, korkeakoulujen, liikennelaitosten ja pyöräilyjärjestöjen pystyttämiä eivätkä liiketoimintaa — juuri siksi niitä on vaikea löytää kaupallisilta kartoilta ja helppo täältä.",
      },
      {
        q: "Toimiiko se varmasti?",
        a: "Ei taatusti. Työkalut katoavat ja pumput hajoavat, ja OpenStreetMap kertoo että piste on olemassa, ei sen kuntoa juuri tällä hetkellä. Pidä sitä todennäköisenä mutta älä varmana, ja pidä rengasrikon varalta omat välineet mukana.",
      },
    ],
  },

  benches: {
    intro: {
      one: "{cityIn} on kartoitettu yksi yleinen penkki. Jos liikut kipeän polven, pienen lapsen tai raskaan kassin kanssa, tieto siitä missä on seuraava paikka istua muuttaa reittiä jonka valitset.",
      other:
        "{cityIn} on kartoitettu {count} yleistä penkkiä. Tämä on täkäläisistä kategorioista suurin ja hiljaisin hyödyllinen: jos liikut kipeän polven, pienen lapsen tai raskaan kassin kanssa, tieto siitä missä on seuraava paikka istua muuttaa reittiä jonka valitset.",
    },
    faq: [
      {
        q: "Missä {cityIn} on penkki?",
        a: {
          one: "Kartta näyttää sen yhden kartoitetun penkin. Puistot, rantaraitit ja pysäkit ovat niitä paikkoja joihin penkit keskittyvät.",
          other:
            "Kartta näyttää {count} kartoitettua penkkiä, ryhmiteltynä kunnes zoomaat tarpeeksi lähelle että ne erottuvat. Puistot, rantaraitit ja pysäkit ovat niitä paikkoja joihin penkit keskittyvät.",
        },
      },
      {
        q: "Onko penkeissä selkänoja?",
        a: "Siellä missä joku on sen kartoittanut, tieto näkyy pisteen tiedoissa. Monelle se on ero käyttökelpoisen penkin ja ohi kävelemisen välillä, ja se on merkintä jonka kartoittaminen kannattaa.",
      },
      {
        q: "Ovatko nämä kaikki penkit {cityIn}?",
        a: "Eivät, eivätkä missään kaupungissa. Penkit ovat viimeisiä kartoitettavia asioita, koska niitä on hyvin paljon. Hyvin kartoitetut keskustat ovat lähes täydellisiä, laitamat harvoin.",
      },
    ],
  },
};

/** Questions that hold for every category, appended after the specific ones */
export const fiCommonFaq = [
  {
    q: "Mistä nämä tiedot ovat peräisin?",
    a: "OpenStreetMapista, joka on vapaaehtoisten kartoittajien rakentama ja jatkuvasti ylläpitämä kartta. Tämänkaltaisille pienille kohteille se on paras saatavilla oleva lähde, koska juuri niitä kaupalliset karttapalvelut eivät vaivaudu keräämään.",
  },
  {
    q: "Jokin puuttuu tai on väärin. Voinko korjata sen?",
    a: "Voit, ja se on nopein tapa saada se kuntoon. Muokkaa pistettä osoitteessa openstreetmap.org, niin muutos siirtyy tälle sivulle seuraavan päivityksen yhteydessä. Täällä ei ole erillistä tietokantaa jota korjata.",
  },
  {
    q: "Onko lista {cityIn} kattava?",
    a: "Yhtä kattava kuin paikan päällä tehty kartoitus. Tiheästi kartoitetuissa kaupungeissa se on lähes täydellinen, muualla kannattaa varautua aukkoihin. Kartta on aina kattavampi näkymä, koska tämän sivun lista nimeää vain ne pisteet joilla on nimi.",
  },
];
