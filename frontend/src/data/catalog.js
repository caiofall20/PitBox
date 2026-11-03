// Catálogo inicial e padrões de marca. Em produção vem da API (tabela catalog_models).
export const CATALOG = [
  { brand: 'Hot Wheels', model: "'70 Ford Escort RS1600", year: '2016', series: 'Fast & Furious', scale: '1:64', photo: null, cast: 'FORD ESCORT RS1600' },
  { brand: 'Hot Wheels', model: 'Bassline', year: '2008', series: 'Teku', scale: '1:64', photo: null, cast: 'BASSLINE BTM639' },
  { toy: 'JBB36', brand: 'Hot Wheels', model: "'94 Bugatti EB110 SS", year: '2025', series: 'HW Race Day', seriesNum: '9/10', colNum: '221/250', scale: '1:64', photo: '/assets/exemplo-frente.jpg' },
];

export const BRAND_RX = [[/HOT\s*-?\s*W?HEEL|HOTWHEEL/, 'Hot Wheels'], [/MATCH\s*BOX/, 'Matchbox'], [/MAJORETTE/, 'Majorette'], [/JADA/, 'Jada Toys'], [/TOMICA|TAKARA/, 'Tomica'], [/MINI\s*GT|MINIGT/, 'Mini GT'], [/MAISTO/, 'Maisto'], [/GREEN\s*LIGHT/, 'Greenlight'], [/BBURAGO|BURAGO/, 'Bburago'], [/KYOSHO/, 'Kyosho']];

export const BASEW = new Set(['MADE', 'INDONESIA', 'MALAYSIA', 'THAILAND', 'CHINA', 'VIETNAM', 'MATTEL', 'WHEELS', 'HOTWHEELS', 'MATCHBOX', 'INC', 'PATENT', 'PATENTS', 'PENDING', 'RIGHTS', 'RESERVED', 'MEXICO', 'TOYS', 'LTD']);

export const STOP = new Set(['MADE', 'IN', 'CHINA', 'MALAYSIA', 'THAILAND', 'INDONESIA', 'VIETNAM', 'MATTEL', 'INC', 'HOT', 'WHEELS', 'HOTWHEELS', 'MATCHBOX', 'THE', 'AND', 'LTD', 'TM', 'CO', 'TOYS']);

export const BRANDS = ['Hot Wheels','Matchbox','Jada Toys','Majorette','Mini GT','Tomica','Maisto','Greenlight','Bburago','Kyosho'];
