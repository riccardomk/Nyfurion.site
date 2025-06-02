Per pubblicare rapidamente il sito online, puoi usare uno di questi metodi:

**Con Vercel (consigliato per siti statici):**
```bash
npm install -g vercel
cd "c:\Users\ricca\Desktop\NyfurionWebsite0.1"
vercel
```
Segui le istruzioni a schermo.

**Con Netlify:**
```bash
npm install -g netlify-cli
cd "c:\Users\ricca\Desktop\NyfurionWebsite0.1"
netlify deploy --prod
```
Scegli la cartella corrente come "public directory" quando richiesto.

**Solo per test locale (non online):**
```bash
cd "c:\Users\ricca\Desktop\NyfurionWebsite0.1"
python -m http.server 8080
```
Poi visita [http://localhost:8080](http://localhost:8080) nel browser.

Scegli il metodo che preferisci!
