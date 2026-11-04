require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const ExifReader = require('exifreader');
const Jimp = require('jimp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const GEO_API_URL = process.env.GEO_API_URL || '';
const GEO_API_KEY = process.env.GEO_API_KEY || '';
const ALLYX_POLL_URL = 'https://open-api.allyxapi.com/v1/task/';

const REGIONS = {
  'Не указано':        { center: [53.9000, 28.0000], bbox: { minLat: 51.20, maxLat: 56.22, minLng: 23.10, maxLng: 32.82 } },
  'Докшицкий район':   { center: [55.0500, 28.4000], bbox: { minLat: 54.55, maxLat: 55.45, minLng: 27.90, maxLng: 28.90 } },
  'Витебский район':   { center: [55.1900, 30.2000], bbox: { minLat: 55.05, maxLat: 55.35, minLng: 30.00, maxLng: 30.40 } },
  'Полоцкий район':    { center: [55.4883, 28.7658], bbox: { minLat: 55.30, maxLat: 55.70, minLng: 28.55, maxLng: 29.05 } },
  'Оршанский район':   { center: [54.5100, 30.4100], bbox: { minLat: 54.35, maxLat: 54.65, minLng: 30.20, maxLng: 30.60 } },
  'Лепельский район':  { center: [54.6800, 28.7000], bbox: { minLat: 54.50, maxLat: 54.85, minLng: 28.40, maxLng: 28.90 } },
  'Глубокский район':  { center: [55.1500, 27.9700], bbox: { minLat: 55.05, maxLat: 55.40, minLng: 27.60, maxLng: 28.10 } },
  'Минский район':     { center: [53.9000, 27.5600], bbox: { minLat: 53.70, maxLat: 54.10, minLng: 27.20, maxLng: 27.90 } },
  'Брестский район':   { center: [52.1000, 23.7000], bbox: { minLat: 51.90, maxLat: 52.40, minLng: 23.40, maxLng: 24.20 } },
  'Гродненский район': { center: [53.6800, 23.8300], bbox: { minLat: 53.55, maxLat: 53.95, minLng: 23.60, maxLng: 24.20 } },
  'Гомельский район':  { center: [52.4400, 30.9800], bbox: { minLat: 52.25, maxLat: 52.70, minLng: 30.60, maxLng: 31.30 } },
  'Могилёвский район': { center: [53.9000, 30.3300], bbox: { minLat: 53.70, maxLat: 54.15, minLng: 29.90, maxLng: 30.60 } }
};

const monuments = [
  { file: 'voinskoe_4119',           name: 'Воинское захоронение № 4119, г. Докшицы, пл. Полевого', lat: 55.3167, lon: 28.4167 },
  { file: 'voinskoe_4117',           name: 'Воинское захоронение № 4117, г. Докшицы', lat: 55.3180, lon: 28.4150 },
  { file: 'bratskaya_mayakovskogo',  name: 'Братская могила, место массового расстрела еврейского населения, г. Докшицы, ул. Маяковского', lat: 55.3150, lon: 28.4200 },
  { file: 'obelisk_277',             name: 'Обелиск воинам 277-ой стрелковой дивизии, г. Докшицы', lat: 55.3170, lon: 28.4140 },
  { file: 'bratskaya_7841',          name: 'Братская могила № 7841, г. Докшицы, кладбище «Блонь»', lat: 55.3100, lon: 28.4100 },
  { file: 'zahoronenie_8014',        name: 'Захоронение жертв войны № 8014, г. Докшицы, кладбище «Блонь»', lat: 55.3095, lon: 28.4095 },
  { file: 'yanki',                   name: 'Памятник землякам, д. Янки', lat: 55.2833, lon: 28.3333 },
  { file: 'krasnoe_berezino',        name: 'Памятник землякам, д. Красное Березино', lat: 55.2700, lon: 28.3100 },
  { file: 'barsuki',                 name: 'Памятник землякам, аг. Барсуки', lat: 55.2500, lon: 28.3500 },
  { file: 'komaysk',                 name: 'Памятник землякам, д. Комайск', lat: 55.2600, lon: 28.4500 },
  { file: 'bratskaya_2204',          name: 'Братская могила № 2204, г.п. Бегомль', lat: 54.7342, lon: 28.0556 },
  { file: 'begoml_fashizm',          name: 'Памятник жертвам фашизма, г.п. Бегомль', lat: 54.7330, lon: 28.0540 },
  { file: 'begoml_sovetskaya',       name: 'Памятное место, г.п. Бегомль, ул. Советская', lat: 54.7350, lon: 28.0570 },
  { file: 'begoml_yuhnovtsa',        name: 'Памятный знак на месте расстрела подпольщиков, г.п. Бегомль, ул. Юхновца', lat: 54.7320, lon: 28.0560 },
  { file: 'brigada_zheleznyak',      name: 'Памятник партизанской бригаде «Железняк», г.п. Бегомль', lat: 54.7345, lon: 28.0550 },
  { file: 'mankovich',               name: 'Бюст С.С. Манковичу, г.п. Бегомль', lat: 54.7338, lon: 28.0548 },
  { file: 'begoml_pogibshim',        name: 'Памятник погибшим землякам, г.п. Бегомль', lat: 54.7340, lon: 28.0555 },
  { file: 'aerodrom',                name: 'Обелиск «Партизанский аэродром», г.п. Бегомль', lat: 54.7450, lon: 28.0500 },
  { file: 'bratskaya_7474',          name: 'Братская могила № 7474, д. Марговица', lat: 54.7500, lon: 28.0900 },
  { file: 'bratskaya_7255',          name: 'Братская могила № 7255, д. Сосновая', lat: 54.7300, lon: 28.0400 },
  { file: 'yuhnovka',                name: 'Памятник партизанской славы, д. Юхновка', lat: 54.7280, lon: 28.0700 },
  { file: 'shunevka',                name: 'Мемориальный комплекс «Шуневка», урочище «Шуневка»', lat: 54.7800, lon: 28.0500 },
  { file: 'prudniki',                name: 'Памятник землякам, аг. Прудники', lat: 55.2600, lon: 28.5200 },
  { file: 'osovy',                   name: 'Памятник жертвам фашизма, д. Осовы', lat: 55.2900, lon: 28.3800 },
  { file: 'milkun',                  name: 'Памятник землякам, д. Милькунь', lat: 55.2900, lon: 28.4300 },
  { file: 'zahoronenie_7955',        name: 'Захоронение жертв войны № 7955, д. Милькунь', lat: 55.2895, lon: 28.4305 },
  { file: 'budilovka',               name: 'Мемориальный комплекс, д. Будиловка', lat: 55.2800, lon: 28.4400 },
  { file: 'glinnoe',                 name: 'Памятник землякам, д. Глинное', lat: 55.3000, lon: 28.3900 },
  { file: 'pustoselie',              name: 'Памятник землякам, д. Пустоселье', lat: 55.3100, lon: 28.4000 },
  { file: 'berezino',                name: 'Памятник землякам, д. Березино', lat: 55.2700, lon: 28.3200 },
  { file: 'volberovichi',            name: 'Памятник землякам, д. Вольберовичи', lat: 55.3400, lon: 28.4100 },
  { file: 'lipsk',                   name: 'Памятник землякам, д. Липск', lat: 55.3300, lon: 28.4500 },
  { file: 'ulesie_zvonok',           name: 'Памятник на месте прорыва блокады партизанами бригады «Железняк», д. Улесье, урочище «Звонок»', lat: 55.3000, lon: 28.5000 },
  { file: 'fedorii',                 name: 'Памятное место, д. Федорки', lat: 55.2800, lon: 28.4600 },
  { file: 'shalagiry',               name: 'Могила подпольщиков Никоновой А.А. и Новицкой А.Л., д. Шалагиры', lat: 55.3200, lon: 28.4200 },
  { file: 'zarechick',               name: 'Могила подпольщиков Гаврилович М.А. и Демидович М.В., д. Заречицк', lat: 55.3100, lon: 28.3900 },
  { file: 'tumilovichi',             name: 'Памятник землякам, д. Тумиловичи', lat: 55.3500, lon: 28.3800 },
  { file: 'nesterovschina',          name: 'Памятник землякам, д. Нестеровщина', lat: 55.1500, lon: 28.5000 },
  { file: 'rechnye',                 name: 'Памятник землякам, д. Речные', lat: 55.2000, lon: 28.5500 },
  { file: 'gornovo',                 name: 'Памятное место, д. Горново', lat: 55.2500, lon: 28.4000 },
  { file: 'torguny',                 name: 'Памятник землякам, аг. Торгуны', lat: 55.2500, lon: 28.5500 },
  { file: 'bratskaya_2203',          name: 'Братская могила № 2203, аг. Березки', lat: 55.0500, lon: 28.6500 },
  { file: 'bratskaya_2202',          name: 'Братская могила № 2202, д. Витуничи', lat: 55.1000, lon: 28.6000 },
  { file: 'bratskaya_2201',          name: 'Братская могила № 2201, д. Старое Запонье, урочище «Калюга»', lat: 55.1000, lon: 28.5500 },
  { file: 'bratskaya_7253',          name: 'Братская могила № 7253, д. Вилейка', lat: 55.0500, lon: 28.5500 },
  { file: 'bratskaya_7254',          name: 'Братская могила № 7254, д. Жамойск', lat: 55.0500, lon: 28.5500 },
  { file: 'dormontovo',              name: 'Памятник землякам, д. Дормонтово', lat: 55.2000, lon: 28.6000 },
  { file: 'chernysh',                name: 'Памятник А.И. Чернышу, аг. Березки', lat: 55.0510, lon: 28.6510 },
  { file: 'gorodische',              name: 'Памятник землякам, д. Городище', lat: 55.2500, lon: 28.4500 },
  { file: 'stanislavcy',             name: 'Памятник землякам, д. Станиславцы', lat: 55.2800, lon: 28.3500 },
  { file: 'zagatie',                 name: 'Памятник землякам, д. Загатье', lat: 55.1500, lon: 28.4500 },
  { file: 'volkolata',               name: 'Памятник землякам, аг. Волколата', lat: 55.2000, lon: 28.3500 },
  { file: 'bratskaya_4118',          name: 'Братская могила № 4118, аг. Парафьяново', lat: 55.2167, lon: 28.7000 },
  { file: 'bratskaya_5594',          name: 'Братская могила № 5594, аг. Парафьяново', lat: 55.2160, lon: 28.6990 },
  { file: 'zolotuhi',                name: 'Памятник на месте сожжённой деревни Золотухи', lat: 55.2500, lon: 28.5000 },
  { file: 'yurkovschina',            name: 'Памятник землякам, д. Юрковщина', lat: 55.2000, lon: 28.5000 },
  { file: 'azarchy',                 name: 'Памятник на месте сожжённой деревни Азарцы', lat: 55.2500, lon: 28.4500 },
  { file: 'sitcy',                   name: 'Памятник землякам, аг. Ситцы', lat: 55.2833, lon: 28.5333 },
  { file: 'hodorovka',               name: 'Место массового уничтожения № 5593, урочище «Ходоровка»', lat: 55.2000, lon: 28.4000 },
  { file: 'porplische',              name: 'Памятник землякам, аг. Порплище', lat: 55.2500, lon: 28.4500 },
  { file: 'krulevschina',            name: 'Памятник землякам, аг. Крулевщина', lat: 55.2333, lon: 28.7333 },
  { file: 'molozhane_avi',           name: 'Обелиск в память о героизме лётчиков 132-го авиаполка, д. Моложане', lat: 55.3000, lon: 28.4000 },
  { file: 'molozhane_dzhan',         name: 'Могила Джанджгава Григория Эрастовича № 7840, д. Моложане', lat: 55.3005, lon: 28.4010 },
  { file: 'berezovka',               name: 'Памятник землякам, д. Березовка', lat: 55.3500, lon: 28.4200 },
  { file: 'sev_gnezdilovo',          name: 'Памятник землякам, д. Северное Гнездилово', lat: 55.3000, lon: 28.3000 },
  { file: 'kripuli',                 name: 'Памятник землякам, д. Крипули', lat: 55.3300, lon: 28.3500 },
  { file: 'evreiskoe_doksh',         name: 'Еврейское кладбище, г. Докшицы', lat: 55.3150, lon: 28.4150 },
  { file: 'beresnevka',              name: 'Бюст Героя Советского Союза Юхновца А.Г., д. Береснёвка', lat: 55.3200, lon: 28.4500 },
  { file: 'st_krulevschina',         name: 'Памятное место, ст. Крулевщина', lat: 55.2400, lon: 28.7300 }
];

const testPhotos = [
  { file: 'dokshitsy_center',        name: 'Центр Докшиц, главная площадь', lat: 55.3167, lon: 28.4167 },
  { file: 'lesnaya_street',          name: 'Улица Лесная, жилой квартал', lat: 55.3200, lon: 28.4000 },
  { file: 'naroch_lake',             name: 'Озеро Нарочь (вне зоны Докшицкого района)', lat: 54.8500, lon: 26.7333 },
  { file: 'vokzal_dokshitsy',        name: 'Железнодорожный вокзал Докшиц', lat: 55.3050, lon: 28.3900 },
  { file: 'park_oktyabrsky',         name: 'Парк «Октябрьский»', lat: 55.3300, lon: 28.4200 },
  { file: 'vitebsk_dvina',           name: 'Набережная Западной Двины, Витебск', lat: 55.1900, lon: 30.2000 },
  { file: 'polotsk_sophia',          name: 'Софийский собор, Полоцк', lat: 55.4883, lon: 28.7658 },
  { file: 'orsha_station',           name: 'Вокзал Орши', lat: 54.5100, lon: 30.4100 }
];

const mockDatabase = monuments.concat(testPhotos);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Неверный формат файла. Поддерживаются только JPG и PNG.'));
    }
    cb(null, true);
  }
});

async function analyzeViaApi(fileBuffer, filename, clues) {
  if (!GEO_API_URL || !GEO_API_KEY) {
    return null;
  }

  const mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const imageBase64 = fileBuffer.toString('base64');
  const dataUrl = 'data:' + mime + ';base64,' + imageBase64;

  const createController = new AbortController();
  const createTimeout = setTimeout(() => createController.abort(), 20000);

  try {
    const body = {
      model: 'geospy',
      input: {
        image_urls: [dataUrl],
        prompt: clues || 'Find the most likely location'
      },
      async: true
    };

    const createRes = await fetch(GEO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GEO_API_KEY
      },
      body: JSON.stringify(body),
      signal: createController.signal
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => '');
      console.error('Allyx create failed:', createRes.status, errText.slice(0, 300));
      return null;
    }

    const createData = await createRes.json();
    const taskId = createData.task_id || createData.id || (createData.data && (createData.data.task_id || createData.data.id));

    if (!taskId) {
      console.error('Allyx: no task_id in response:', JSON.stringify(createData).slice(0, 300));
      return null;
    }

    console.log('Allyx task created:', taskId);

    const pollUrl = ALLYX_POLL_URL + taskId;
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 1500));

      let pollRes;
      try {
        pollRes = await fetch(pollUrl, {
          headers: { 'Authorization': 'Bearer ' + GEO_API_KEY }
        });
      } catch (e) {
        continue;
      }

      if (!pollRes.ok) {
        continue;
      }

      const pollData = await pollRes.json();
      const state = pollData.state || (pollData.data && pollData.data.state);

      if (state === 'completed' || state === 'success' || state === 'succeeded') {
        const result = pollData.resultJson || pollData.result || (pollData.data && (pollData.data.resultJson || pollData.data.result));

        if (!result) {
          console.error('Allyx: no result in completed task');
          return null;
        }

        let locations = result.locations || result.results || (result.data && result.data.locations);
        if (!Array.isArray(locations) || !locations.length) {
          console.error('Allyx: no locations in result');
          return null;
        }

        const best = locations[0];
        const coords = best.coordinates || best.location || best;
        const lat = coords.lat != null ? coords.lat : (coords.latitude != null ? coords.latitude : null);
        const lon = coords.lng != null ? coords.lng : (coords.lon != null ? coords.lon : (coords.longitude != null ? coords.longitude : null));

        if (lat === null || lon === null) {
          console.error('Allyx: no coordinates in first location');
          return null;
        }

        const description = best.explanation || best.description || best.name || best.address || 'Место распознано Allyx/GeoSpy';

        return {
          success: true,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          description: description,
          source: 'api',
          rawResponse: pollData
        };
      }

      if (state === 'failed' || state === 'error') {
        console.error('Allyx task failed:', JSON.stringify(pollData).slice(0, 300));
        return null;
      }
    }

    console.error('Allyx task timeout (30 attempts)');
    return null;
  } catch (err) {
    console.error('Allyx API error:', err.message);
    return null;
  } finally {
    clearTimeout(createTimeout);
  }
}

function analyzeViaExif(fileBuffer) {
  try {
    const tags = ExifReader.load(fileBuffer);
    const latTag = tags['GPSLatitude'];
    const lonTag = tags['GPSLongitude'];

    if (latTag && lonTag && latTag.description && lonTag.description) {
      const lat = parseFloat(latTag.description);
      const lon = parseFloat(lonTag.description);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return {
          success: true,
          lat: lat,
          lon: lon,
          description: 'Место определено по GPS-данным, сохранённым в фото (EXIF)',
          source: 'exif',
          rawResponse: null
        };
      }
    }
  } catch (err) {}
  return null;
}

function analyzeViaFilename(filename) {
  const baseName = filename.replace(/\.[^.]+$/, '').toLowerCase();
  const match = mockDatabase.find(item => item.file.toLowerCase() === baseName);
  if (match) {
    return {
      success: true,
      lat: match.lat,
      lon: match.lon,
      description: match.name,
      file: match.file,
      source: 'mock',
      rawResponse: null
    };
  }
  return null;
}

async function analyzeOffline(fileBuffer, filename) {
  const exifResult = analyzeViaExif(fileBuffer);
  if (exifResult) return exifResult;

  const byName = analyzeViaFilename(filename);
  if (byName) return byName;

  return {
    success: false,
    lat: null,
    lon: null,
    description: 'Не удалось определить место: в фото нет GPS-данных (EXIF), ' +
                 'а имя файла не совпадает с эталонным.',
    source: 'mock',
    rawResponse: null
  };
}

function isInRegion(lat, lon, regionName) {
  const region = REGIONS[regionName];
  if (!region) return false;
  const b = region.bbox;
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLng && lon <= b.maxLng;
}

app.post('/analyze-image', upload.single('photo'), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл не загружен. Прикрепите изображение в поле photo.'
      });
    }

    const filename = req.file.originalname;

    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].indexOf(ext) === -1) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат файла. Поддерживаются только JPG и PNG.'
      });
    }

    const region = REGIONS[req.body.region] ? req.body.region : 'Не указано';
    const userClue = (req.body.clue || '').trim();

    let clues = (region === 'Не указано') ? 'Беларусь' : 'Беларусь, ' + region;
    if (userClue) clues += ', ' + userClue;

    let result = await analyzeViaApi(req.file.buffer, filename, clues);
    if (!result) {
      result = await analyzeOffline(req.file.buffer, filename);
    }

    if (result.success && !isInRegion(result.lat, result.lon, region)) {
      return res.json({
        success: false,
        lat: null,
        lon: null,
        description: '',
        source: result.source,
        error: 'out_of_zone'
      });
    }

    console.log('Request:', filename, '| Region:', region, '| Source:', result.source);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(function (err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'Файл слишком большой. Максимальный размер — 5 МБ.'
    });
  }
  console.error(err);
  res.status(500).json({ success: false, error: err.message || 'Внутренняя ошибка сервера.' });
});

app.listen(PORT, function () {
  console.log('Докшицкий Локатор запущен: http://localhost:' + PORT);
  console.log('Режим API: ' + (GEO_API_URL && GEO_API_KEY ? 'включён (Allyx/GeoSpy)' : 'офлайн-эмуляция'));
});