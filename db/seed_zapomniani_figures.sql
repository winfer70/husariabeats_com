-- db/seed_zapomniani_figures.sql
-- Seeds the 11 ZAPOMNIANI album historical figures into historical_figures.
-- Idempotent: uses INSERT ... ON CONFLICT (slug) DO UPDATE.

INSERT INTO historical_figures
    (slug, name_pl, name_en, birth_year, death_year,
     bio_pl, bio_en,
     arc_west_pl, arc_west_en,
     arc_east_pl, arc_east_en)
VALUES

-- 1. Rotmistrz Witold Pilecki
(
    'captain-pilecki',
    'Rotmistrz Witold Pilecki',
    'Captain Witold Pilecki',
    1901, 1948,
    'Witold Pilecki to jeden z największych bohaterów II wojny światowej — jedyny człowiek, który dobrowolnie dał się aresztować i osadzić w obozie Auschwitz, by zorganizować tam ruch oporu. Przesyłał raporty o Holokauście na Zachód, zanim świat chciał słuchać. Po ucieczce z obozu walczył w Powstaniu Warszawskim. Powrócił do Polski, by działać w podziemiu — i został aresztowany przez komunistów, poddany torturom, sfingowanemu procesowi i rozstrzelany w 1948 roku.',
    'Witold Pilecki is one of the greatest heroes of World War II — the only man known to have voluntarily had himself arrested and sent to Auschwitz to organize the resistance from within. He sent reports on the Holocaust to the West long before the world was ready to listen. After escaping the camp he fought in the Warsaw Uprising. He returned to communist Poland as an agent, was arrested, tortured, subjected to a show trial, and executed in 1948.',
    'Raporty Pileckiego o ludobójstwie w Auschwitz były przekazywane aliantom zachodnim od 1941 roku. Wielka Brytania i Stany Zjednoczone zignorowały je lub zbagatelizowały — nie podjęły żadnych działań, by zbombardować tory kolejowe prowadzące do obozu ani ostrzec europejskich Żydów. Zachód nie upomniał się o niego po wojnie, gdy komuniści go aresztowali.',
    'Pilecki''s reports on the Auschwitz genocide were passed to Western Allies from 1941. Britain and the United States ignored or downplayed them — they took no action to bomb the rail lines or warn European Jews. After the war, when communists arrested him, the West made no effort to intervene on his behalf.',
    'Po powrocie do Polski komunistyczny aparat bezpieczeństwa UB aresztował Pileckiego w 1947 roku. Był torturowany podczas przesłuchań. W pokazowym procesie skazano go na śmierć pod zarzutem szpiegostwa — oskarżenie absurdalne wobec człowieka, który dobrowolnie poszedł do Auschwitz. Został rozstrzelany 25 maja 1948 roku. Przez dekady komunistyczna Polska wymazała jego imię z historii.',
    'After returning to Poland, the communist security apparatus UB arrested Pilecki in 1947. He was tortured during interrogations. In a show trial, he was sentenced to death on charges of espionage — an absurdity against the man who voluntarily walked into Auschwitz. He was shot on 25 May 1948. For decades communist Poland erased his name from history.'
),

-- 2. Gen. August Emil Fieldorf "Nil"
(
    'fieldorf-nil',
    'Gen. August Emil Fieldorf "Nil"',
    'Gen. August Emil Fieldorf "Nil"',
    1895, 1953,
    'August Emil Fieldorf, pseudonim "Nil", był jednym z najważniejszych dowódców polskiego podziemia zbrojnego w czasie II wojny światowej. Jako komendant Kedywu (Kierownictwa Dywersji AK) nadzorował sabotaż, dywersję i akcje likwidacyjne — w tym głośną egzekucję Franza Kutschery, szefa SS i Policji w Warszawie, odpowiedzialnego za masowe łapanki i egzekucje. Przeżył nazistowskie obozy koncentracyjne. Po wojnie wrócił do Polski, gdzie komuniści go aresztowali i powiesili w wyniku sfingowanego procesu.',
    'August Emil Fieldorf, codename "Nil", was one of the most important commanders of the Polish wartime underground. As head of Kedyw (the AK Sabotage Directorate) he oversaw sabotage, diversionary operations, and targeted killings — including the celebrated execution of Franz Kutschera, SS and Police Chief in Warsaw responsible for mass roundups and executions. He survived Nazi concentration camps. After the war he returned to Poland, where the communists arrested and hanged him following a show trial.',
    'Działania Kedywu pod dowództwem Fieldorfa były kluczowe dla morale polskiego oporu, jednak alianci zachodni nigdy nie zapewnili AK wystarczającego wsparcia logistycznego ani uznania dyplomatycznego. Po wojnie Zachód milczał, gdy komuniści mordowali polskich bohaterów wojennych jeden po drugim.',
    'Kedyw operations under Fieldorf were crucial to Polish resistance morale, yet Western Allies never provided the AK with adequate logistical support or diplomatic recognition. After the war, the West remained silent as communists methodically executed Polish war heroes one by one.',
    'Fieldorf został aresztowany przez UB w 1950 roku. Komunistyczny prokurator oskarżył go o kolaborację z Niemcami — odwrotność prawdy, groteskowe fałszerstwo historyczne. Skazano go na śmierć i powieszono 24 lutego 1953 roku. Komunistyczna propaganda przez lata przedstawiała go jako zbrodniarza wojennego.',
    'Fieldorf was arrested by the UB in 1950. A communist prosecutor charged him with collaborating with the Germans — the precise inverse of the truth, a grotesque historical fabrication. He was sentenced to death and hanged on 24 February 1953. Communist propaganda portrayed him as a war criminal for years afterward.'
),

-- 3. Gen. Stanisław Maczek
(
    'general-maczek',
    'Gen. Stanisław Maczek',
    'Gen. Stanisław Maczek',
    1892, 1994,
    'Stanisław Maczek dowodził 10 Brygadą Kawalerii — "Czarną Brygadą" — jako jedyną polską formacją, która nie dała się rozbić w kampanii 1939 roku, przeprowadzając w porządku odwrót do Francji. Następnie dowodził 1 Dywizją Pancerną, która wzięła udział w operacji Overlord, uczestniczyła w zamknięciu Kotła Falaise i wyzwoliła holenderskie miasto Breda bez jednej ofiary cywilnej. Po wojnie komunistyczna Polska pozbawiła go obywatelstwa. Zamieszkał w Edynburgu, gdzie przez wiele lat pracował jako barman, by utrzymać rodzinę.',
    'Stanisław Maczek commanded the 10th Cavalry Brigade — the "Black Brigade" — as the only Polish formation that avoided destruction in the 1939 campaign, withdrawing in good order to France. He then commanded the 1st Armoured Division, which took part in Operation Overlord, participated in closing the Falaise Pocket, and liberated the Dutch city of Breda without a single civilian casualty. After the war communist Poland stripped him of his citizenship. He settled in Edinburgh, where he worked for years as a bartender to support his family.',
    'Maczek i jego dywizja walczyli pod brytyjskim dowództwem, jednak po wojnie Wielka Brytania odmówiła mu — i dziesiątkom tysięcy polskich żołnierzy — prawa do uczestnictwa w Paradzie Zwycięstwa w Londynie w 1946 roku, obawiając się drażnienia Stalina. Wielka Brytania nie zapewniła mu też adekwatnej emerytury ani godnego uznania przez dziesięciolecia. Holandia pierwsza przyznała mu honorowe obywatelstwo i odznaczyła go — Wielka Brytania zrobiła to dopiero w 2002 roku, gdy miał 110 lat.',
    'Maczek and his division fought under British command, yet after the war Britain denied him — and tens of thousands of Polish soldiers — a place in the 1946 London Victory Parade, fearing to antagonise Stalin. Britain also failed to provide him an adequate pension or proper recognition for decades. The Netherlands was first to grant him honorary citizenship and honours; Britain only did so in 2002, when he was 110 years old.',
    'Komunistyczna Polska pozbawiła Maczka obywatelstwa i skonfiskowała majątek rodziny w 1946 roku, ponieważ odmówił powrotu i akceptacji nowego reżimu. Jego imię było zakazane w podręcznikach historii PRL. Przez dekady polskie dzieci nie wiedziały, że istniał.',
    'Communist Poland stripped Maczek of citizenship and confiscated his family''s property in 1946 because he refused to return and accept the new regime. His name was banned from history textbooks in the Polish People''s Republic. For decades Polish children did not know he existed.'
),

-- 4. Prof. Janusz Groszkowski
(
    'groszkowski-janusz',
    'Prof. Janusz Groszkowski',
    'Prof. Janusz Groszkowski',
    1898, 1984,
    'Janusz Groszkowski był wybitnym polskim inżynierem elektronicznym i uczonym. W czasie II wojny światowej był jednym z kluczowych naukowców zaangażowanych w tajny program analizy niemieckich rakiet V-2 na terenach okupowanej Polski. Jego badania i pomiary składników rakiet — przeprowadzone w ekstremalnym niebezpieczeństwie — zostały w 1944 roku przewiezione kurierami do Londynu, co umożliwiło aliantom lepsze zrozumienie zaawansowanej technologii rakietowej III Rzeszy. Po wojnie był zmuszony do współpracy z komunistycznym reżimem, który instrumentalizował jego prestiż naukowy.',
    'Janusz Groszkowski was an outstanding Polish electronics engineer and scientist. During World War II he was one of the key scientists involved in the secret programme to analyse German V-2 rockets on occupied Polish territory. His research findings and component measurements — conducted under extreme danger — were carried by secret courier to London in 1944, enabling the Allies to better understand the Reich''s advanced rocket technology. After the war he was compelled to collaborate with the communist regime, which instrumentalised his scientific prestige.',
    'Groszkowski''s findings on V-2 technology, delivered to the British at great risk by the Polish underground, were invaluable to Allied intelligence. Yet the contribution of the Polish scientific underground to Allied victory was largely unacknowledged in Western accounts of the war. Groszkowski himself received no Western recognition commensurate with his contribution.',
    'Wyniki badań Groszkowskiego nad rakietami V-2, dostarczone Brytyjczykom z wielkim ryzykiem przez polskie podziemie, były bezcenne dla alianckiego wywiadu. Jednak wkład polskiego podziemia naukowego w alianckie zwycięstwo był w zachodnich relacjach z wojny w dużej mierze przemilczany. Sam Groszkowski nie otrzymał zachodniego uznania adekwatnego do swojego wkładu.',
    'Po wojnie komunistyczny reżim w Polsce zmusił Groszkowskiego do służby państwowej i uczestnictwa w strukturach władzy, które nie były zgodne z jego przekonaniami. Jego wojenną działalność konspiracyjną przemilczano, eksponując zamiast niej jego powojenną rolę w komunistycznych instytucjach naukowych — co zaciemniało prawdziwy obraz jego bohaterstwa.',
    'After the war the communist regime compelled Groszkowski into state service and participation in power structures incompatible with his beliefs. His wartime underground activities were suppressed while his postwar role in communist scientific institutions was emphasised — obscuring the true picture of his heroism.'
),

-- 5. Zapomniani — Intro
(
    'zapomniani-intro',
    'Zapomniani — Intro',
    'Forgotten — Intro',
    NULL, NULL,
    'ZAPOMNIANI to album poświęcony polskim bohaterom, których historia zepchnęła w cień — ofiarom podwójnej zdrady: porzuconym przez Zachód i wymazanym przez komunistów. Ci mężczyźni i kobiety walczyli za wolność, której nigdy nie doświadczyli. Ginęli, by Europa mogła żyć. A gdy Europa świętowała — ich imiona znikały z podręczników, ich groby zapominano, ich rodziny prześladowano. Ten album jest ich głosem.',
    'ZAPOMNIANI (Forgotten) is an album dedicated to Polish heroes pushed to the margins of history — victims of a double betrayal: abandoned by the West and erased by the communists. These men and women fought for a freedom they never experienced. They died so Europe could live. And when Europe celebrated, their names vanished from textbooks, their graves were forgotten, their families persecuted. This album is their voice.',
    'Zachód, który Polska ratowała podczas II wojny światowej — dostarczając wywiadu, kryptografii, krwi żołnierzy — oddał ją Stalinowi w Jałcie bez konsultacji z polskim rządem na uchodźstwie. Bohaterowie, którzy przeżyli wojnę, wracali do kraju, który stał się sowiecką kolonią. Zachód patrzył.',
    'The West that Poland helped save during World War II — through intelligence, codebreaking, and soldiers'' blood — handed it to Stalin at Yalta without consulting the Polish government-in-exile. Heroes who survived the war returned to a country that had become a Soviet colony. The West watched.',
    'Komunistyczna Polska przez dekady systematycznie wymazywała ze świadomości zbiorowej tych, którzy walczyli pod komendą londyńskiego rządu na uchodźstwie. Armia Krajowa, żołnierze niezłomni, oficerowie — wszyscy stali się wrogami ludu w oczach nowego reżimu. Wielu zginęło. Wielu trafiło do więzień. Wszyscy zostali zapomniani.',
    'Communist Poland systematically erased from collective memory those who had fought under the London government-in-exile''s command. The Home Army, the cursed soldiers, the officers — all became enemies of the people in the eyes of the new regime. Many were killed. Many were imprisoned. All were forgotten.'
),

-- 6. Rotmistrz Jerzy Sosnowski
(
    'jerzy-sosnowski',
    'Rotmistrz Jerzy Sosnowski',
    'Capt. Jerzy Sosnowski',
    1896, 1942,
    'Jerzy Sosnowski był jednym z najskuteczniejszych polskich oficerów wywiadu okresu międzywojennego. W latach 1926–1934 działał w Berlinie pod przykrywką jako "Georg von Sosnowski", infiltrując Reichswehrę i zdobywając plany niemieckiego zbrojenia — bezcenne informacje dla polskiego i alianckiego wywiadu. Aresztowany przez Abwehrę w 1934 roku, wymieniony w 1936 roku w ramach wymiany jeńców. Po powrocie do Polski wpadł w ręce NKWD, które zamordowało go w 1942 roku.',
    'Jerzy Sosnowski was one of the most effective Polish intelligence officers of the interwar period. From 1926 to 1934 he operated in Berlin under the cover identity of "Georg von Sosnowski", infiltrating the Reichswehr and obtaining Germany''s secret rearmament plans — information of priceless value to Polish and Allied intelligence. Arrested by the Abwehr in 1934, he was exchanged in a prisoner swap in 1936. After returning to Poland he fell into NKVD hands, which murdered him in 1942.',
    'Informacje zdobyte przez Sosnowskiego o tajnym zbrojeniu Niemiec trafiały do zachodnich służb wywiadowczych. Mimo to Wielka Brytania i Francja ignorowały ostrzeżenia o rosnącym zagrożeniu ze strony III Rzeszy przez całe lata 30. Poświęcenie polskich szpiegów nie przekładało się na polityczną wolę działania na Zachodzie.',
    'Intelligence obtained by Sosnowski on Germany''s secret rearmament was shared with Western intelligence services. Yet Britain and France ignored warnings about the growing Reich threat throughout the 1930s. The sacrifice of Polish spies did not translate into political will to act in the West.',
    'Po wymianie Sosnowski był przesłuchiwany przez sowiecki wywiad. NKWD — sojusznik nazistów w latach 1939–1941 — zamordowało go w 1942 roku w okolicznościach, które do dziś nie zostały w pełni wyjaśnione. Człowiek, który narażał życie, by wykryć zbrojenie Niemiec, zginął z rąk sowieckiego aparatu represji.',
    'After the prisoner exchange Sosnowski was interrogated by Soviet intelligence. The NKVD — Nazi Germany''s ally in 1939–1941 — murdered him in 1942 under circumstances that have never been fully clarified. The man who risked his life to expose German rearmament was killed by the Soviet repression apparatus.'
),

-- 7. Józef Kosacki
(
    'kosacki-mine-detector',
    'Józef Kosacki',
    'Józef Kosacki',
    1909, 1990,
    'Józef Kosacki był polskim inżynierem wojskowym, który w 1941 roku wynalazł przenośny wykrywacz min — urządzenie, które zrewolucjonizowało sposób prowadzenia działań rozminowujących przez aliantów podczas całej II wojny światowej. Detektor Kosackiego był używany przez oddziały alianckie w Afryce Północnej, Europie Zachodniej i na Dalekim Wschodzie. Kosacki nie otrzymał żadnych tantiem za swój wynalazek — przekazał go bezpłatnie sojuszniczym siłom zbrojnym. Jego nazwisko jest niemal nieznane w zachodniej historii.',
    'Józef Kosacki was a Polish military engineer who in 1941 invented the portable mine detector — a device that revolutionised Allied mine-clearing operations throughout World War II. The Kosacki detector was used by Allied troops in North Africa, Western Europe, and the Far East. Kosacki received no patent royalties for his invention — he gave it freely to the Allied armed forces. His name is almost unknown in Western history.',
    'Detektor Kosackiego uratował niezliczone życia alianckich żołnierzy. Wynalazek ten przekazano bezpłatnie wojskom brytyjskim, a następnie wszystkim siłom alianckim. Kosacki nie otrzymał za niego żadnego wynagrodzenia, patentu ani należytego uznania w zachodnich historiach II wojny światowej. Jego wkład jest regularnie pomijany lub przypisywany innym.',
    'Kosacki''s mine detector saved countless Allied soldiers'' lives. The invention was given free of charge to British forces and subsequently to all Allied forces. Kosacki received no payment, no patent protection, and no proper recognition in Western histories of World War II. His contribution is routinely overlooked or attributed to others.',
    'Komunistyczna Polska nie uhonorowała Kosackiego w sposób adekwatny do jego wkładu — wynalazca, który bezinteresownie służył aliantom, nie pasował do narracji nowego reżimu. Jego historia była marginalizowana przez cały okres PRL, a on sam dożył końca życia w względnym zapomnieniu.',
    'Communist Poland did not honour Kosacki in a manner proportionate to his contribution — an inventor who selflessly served the Allies did not fit the narrative of the new regime. His story was marginalised throughout the Polish People''s Republic period, and he lived out his life in relative obscurity.'
),

-- 8. Łączniczki AK
(
    'laczniczki-ak',
    'Łączniczki AK',
    'AK Female Couriers',
    NULL, NULL,
    'Łączniczki Armii Krajowej to młode kobiety — często nastolatki — które w warunkach brutalnej niemieckiej okupacji przenosiły rozkazy, meldunki, broń i prasę podziemną przez całą Polskę. Działając bez munduru i bez ochrony konwencji genewskiej, ryzykowały aresztowanie, tortury i śmierć przy każdym kroku. Wiele z nich zginęło na ulicach, w więzieniach gestapo lub w obozach koncentracyjnych. Ich odwaga podtrzymywała sieć komunikacyjną całego polskiego podziemia.',
    'The female couriers of the Home Army were young women — often teenagers — who under the brutal German occupation carried orders, reports, weapons, and underground press across occupied Poland. Operating without uniform and without the protection of the Geneva Convention, they risked arrest, torture, and death with every step. Many were killed in the streets, in Gestapo prisons, or in concentration camps. Their courage sustained the communication network of the entire Polish underground.',
    'Poświęcenie łączniczek AK rzadko jest upamiętniane w zachodnich narracjach o II wojnie światowej, które skupiają się na frontowych kampaniach wojskowych. Kobiety, które ryzykowały życiem, by utrzymać polskie podziemie w działaniu, pozostają anonimowe w zachodnich podręcznikach historii.',
    'The sacrifice of AK female couriers is rarely commemorated in Western World War II narratives, which focus on front-line military campaigns. The women who risked their lives to keep the Polish underground functioning remain anonymous in Western history books.',
    'Po wojnie wiele łączniczek AK spotkały prześladowania ze strony komunistycznego aparatu bezpieczeństwa. Ich służba w AK czyniła je automatycznie podejrzanymi w oczach nowego reżimu. Niektóre były więzione, inne zmuszone do milczenia. Ich historia przez dekady nie istniała oficjalnie.',
    'After the war many AK female couriers faced persecution by the communist security apparatus. Their service in the AK made them automatically suspect in the eyes of the new regime. Some were imprisoned, others forced into silence. Their history officially did not exist for decades.'
),

-- 9. Gen. Stanisław Sosabowski
(
    'sosabowski-stanislaw',
    'Gen. Stanisław Sosabowski',
    'Gen. Stanisław Sosabowski',
    1892, 1967,
    'Stanisław Sosabowski dowodził 1 Samodzielną Brygadą Spadochronową — pierwszą polską jednostką powietrznodesantową, stworzoną z myślą o wyzwoleniu Polski. Zamiast tego użyto jej podczas operacji Market Garden pod Arnhem w 1944 roku. Sosabowski ostrzegał aliantów, że plan jest błędny i doprowadzi do katastrofy. Zignorowano go. Po klęsce pod Arnhem generałowie brytyjscy, w tym Montgomery, obarczyli Sosabowskiego odpowiedzialnością za niepowodzenie operacji. Pozbawiony dowództwa, zakończył wojnę jako wyrzutek.',
    'Stanisław Sosabowski commanded the 1st Independent Parachute Brigade — the first Polish airborne unit, created with the aim of liberating Poland. Instead it was deployed during Operation Market Garden at Arnhem in 1944. Sosabowski warned the Allies that the plan was flawed and would end in disaster. He was ignored. After the Arnhem defeat, British generals including Montgomery blamed Sosabowski for the operation''s failure. Stripped of his command, he ended the war as an outcast.',
    'Sosabowski ostrzegał Montgomerego i aliantów przed operacją Market Garden. Jego ostrzeżenia zlekceważono. Po katastrofie pod Arnhem generałowie brytyjscy potrzebowali kozła ofiarnego — wybrali Sosabowskiego. Wielka Brytania poparła jego odwołanie pod naciskiem alianckim. Przez dekady oficjalna brytyjska i aliancka historia przypisywała mu winę za klęskę, którą zaplanowali inni.',
    'Sosabowski warned Montgomery and the Allies about Operation Market Garden. His warnings were dismissed. After the Arnhem catastrophe, British generals needed a scapegoat — they chose Sosabowski. Britain supported his removal under Allied pressure. For decades official British and Allied history assigned him blame for a failure planned by others.',
    'Komunistyczna Polska nie uznawała Sosabowskiego — generała Polskich Sił Zbrojnych na Zachodzie — za bohatera. Odmówił powrotu do kraju kontrolowanego przez komunistów. Zakończył życie na emigracji w Londynie. Jego rehabilitacja w Polsce nastąpiła dopiero po upadku komunizmu.',
    'Communist Poland did not recognise Sosabowski — a general of the Polish Armed Forces in the West — as a hero. He refused to return to communist-controlled Poland. He ended his life in exile in London. His rehabilitation in Poland only came after the fall of communism.'
),

-- 10. Gen. Kazimierz Sosnkowski
(
    'sosnkowski-kazimierz',
    'Gen. Kazimierz Sosnkowski',
    'Gen. Kazimierz Sosnkowski',
    1885, 1969,
    'Kazimierz Sosnkowski był Naczelnym Wodzem Polskich Sił Zbrojnych i bliskim współpracownikiem Józefa Piłsudskiego. Jako jeden z nielicznych liderów alianckich publicznie i jednoznacznie sprzeciwiał się postanowieniom konferencji jałtańskiej w 1945 roku, które oddawały Polskę w orbitę sowiecką bez zgody polskiego rządu na uchodźstwie. Pod presją brytyjską został zmuszony do rezygnacji ze stanowiska Naczelnego Wodza. Resztę życia spędził na emigracji w Kanadzie.',
    'Kazimierz Sosnkowski was Commander-in-Chief of the Polish Armed Forces and a close associate of Józef Piłsudski. He was one of the very few Allied leaders to publicly and unequivocally protest the Yalta Conference decisions of 1945, which handed Poland into the Soviet orbit without the consent of the Polish government-in-exile. Under British pressure he was forced to resign as Commander-in-Chief. He spent the rest of his life in exile in Canada.',
    'Sosnkowski publicznie protestował przeciwko umowom jałtańskim — aktowi, w którym Wielka Brytania i Stany Zjednoczone oddały Polskę Stalinowi. Jego protest był nagrodzony dymisją wymuszoną przez aliantów zachodnich, którzy woleli spolegliwość od prawdy. Człowiek, który mówił prawdę na głos, musiał odejść — bo prawda była dla Zachodu niewygodna.',
    'Sosnkowski publicly protested the Yalta agreements — the act by which Britain and the United States handed Poland to Stalin. His protest was rewarded with a dismissal forced by Western Allies who preferred compliance to truth. The man who spoke truth aloud had to go — because the truth was inconvenient to the West.',
    'Komunistyczna Polska uznała Sosnkowskiego za wroga państwa. Odmówił powrotu. Na emigracji w Kanadzie pisał i mówił o zdradzie Zachodu i zbrodniach komunizmu. Reżim PRL przez dziesięciolecia przedstawiał go jako faszystę i reakcjonistę — kolejne kłamstwo komunistycznej propagandy.',
    'Communist Poland designated Sosnkowski an enemy of the state. He refused to return. In Canadian exile he wrote and spoke about the Western betrayal and the crimes of communism. The Polish People''s Republic regime portrayed him for decades as a fascist and reactionary — yet another communist propaganda lie.'
),

-- 11. Miś Wojtek
(
    'wojtek-niedzwiedz',
    'Miś Wojtek',
    'Wojtek the Bear',
    1943, 1963,
    'Wojtek był niedźwiedziem brunatnym znalezionym w Iranie w 1943 roku przez żołnierzy Polskiego II Korpusu. Adoptowany jako maskotka, nauczył się nosić skrzynki z amunicją i pociskami artyleryjskie — naśladując żołnierzy. Został oficjalnie zaciągnięty do wojska jako szeregowy (numer żołnierza: 8312507) i brał udział w bitwie pod Monte Cassino w 1944 roku, nosząc skrzynki z amunicją pod ostrzałem. Awansował na stopień kaprala. Po wojnie zamieszkał w ogrodzie zoologicznym w Edynburgu, gdzie odwiedzali go weterani II Korpusu. Nigdy nie wrócił do Polski.',
    'Wojtek was a brown bear found in Iran in 1943 by soldiers of the Polish II Corps. Adopted as a mascot, he learned to carry ammunition crates and artillery shells — mimicking the soldiers around him. He was formally enlisted in the army as a private (service number 8312507) and participated in the Battle of Monte Cassino in 1944, carrying ammunition crates under fire. He was promoted to corporal. After the war he lived at Edinburgh Zoo, where veterans of the II Corps came to visit him. He never returned to Poland.',
    'Wojtek walczył pod Monte Cassino jako żołnierz Polskiego II Korpusu — który brał udział w jednej z najtrudniejszych bitew kampanii włoskiej. Po wojnie Wielka Brytania — jak wobec wszystkich polskich żołnierzy — nie zaoferowała weteranom II Korpusu powrotu do wolnej Polski, bo takiej nie było. Wojtek skończył życie w edynburskim zoo, daleko od karpackich lasów, które były jego domem.',
    'Wojtek fought at Monte Cassino as a soldier of the Polish II Corps — which participated in one of the most gruelling battles of the Italian campaign. After the war, Britain — as with all Polish soldiers — could not offer II Corps veterans a return to a free Poland, because there was none. Wojtek ended his life in Edinburgh Zoo, far from the Carpathian forests that were his home.',
    'Komunistyczna Polska nigdy nie zaprosiła Wojtka do powrotu — symbol polskiego żołnierza walczącego na Zachodzie nie pasował do narracji reżimu, który zwalczał pamięć o Armii Andersa i Polskich Siłach Zbrojnych na Zachodzie. Wojtek, jak jego ludzcy towarzysze broni, był wygnańcem.',
    'Communist Poland never invited Wojtek to return — the symbol of a Polish soldier fighting in the West did not fit the narrative of a regime that combated the memory of Anders'' Army and the Polish Armed Forces in the West. Wojtek, like his human comrades-in-arms, was an exile.'
)

ON CONFLICT (slug) DO UPDATE SET
    name_pl     = EXCLUDED.name_pl,
    name_en     = EXCLUDED.name_en,
    birth_year  = EXCLUDED.birth_year,
    death_year  = EXCLUDED.death_year,
    bio_pl      = EXCLUDED.bio_pl,
    bio_en      = EXCLUDED.bio_en,
    arc_west_pl = EXCLUDED.arc_west_pl,
    arc_west_en = EXCLUDED.arc_west_en,
    arc_east_pl = EXCLUDED.arc_east_pl,
    arc_east_en = EXCLUDED.arc_east_en;
