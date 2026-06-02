import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-sheet-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const isPost = req.method === 'POST';
          const urlPath = req.url.split('?')[0].replace(/\/$/, '');
          
          // ==========================================
          // 1. SAVE SHEET ENDPOINT
          // ==========================================
          if (isPost && urlPath === '/api/save-sheet') {
            let body = '';
            
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', () => {
              try {
                const { sheetId, sheetTitle, sheetNumber, questions } = JSON.parse(body);
                
                if (!sheetId || !questions || !Array.isArray(questions)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid payload elements.' }));
                  return;
                }

                const sheetsDir = path.resolve(__dirname, 'src/data/sheets');
                if (!fs.existsSync(sheetsDir)) {
                  fs.mkdirSync(sheetsDir, { recursive: true });
                }

                const sheetFilePath = path.join(sheetsDir, `${sheetId}.js`);
                
                // Format sheet content as a named export
                let formattedJS = `export const ${sheetId} = {\n`;
                formattedJS += `  id: ${JSON.stringify(sheetId)},\n`;
                formattedJS += `  title: ${JSON.stringify(`${sheetTitle} - Super 100 Sheet ${sheetNumber}`)},\n`;
                formattedJS += `  topic: "Quantitative Aptitude",\n`;
                formattedJS += `  questions: [\n`;
                
                questions.forEach((q, qIdx) => {
                  formattedJS += `    {\n`;
                  formattedJS += `      id: ${q.id},\n`;
                  formattedJS += `      question: ${JSON.stringify(q.question)},\n`;
                  formattedJS += `      questionHindi: ${JSON.stringify(q.questionHindi || '')},\n`;
                  formattedJS += `      options: ${JSON.stringify(q.options)},\n`;
                  formattedJS += `      optionsHindi: ${JSON.stringify(q.optionsHindi || ['', '', '', ''])},\n`;
                  formattedJS += `      correctOption: ${q.correctOption},\n`;
                  formattedJS += `      explanation: ${JSON.stringify(q.explanation || '')},\n`;
                  formattedJS += `      explanationHindi: ${JSON.stringify(q.explanationHindi || '')}`;
                  
                  // Add diagramUrl if it exists
                  if (q.diagramUrl && q.diagramUrl.trim() !== '') {
                    formattedJS += `,\n`;
                    formattedJS += `      diagramUrl: ${JSON.stringify(q.diagramUrl)}`;
                  }
                  
                  formattedJS += `\n`;
                  formattedJS += `    }${qIdx < questions.length - 1 ? ',' : ''}\n`;
                });
                
                formattedJS += `  ]\n`;
                formattedJS += `};\n`;

                fs.writeFileSync(sheetFilePath, formattedJS, 'utf8');

                // Re-generate main questions.js index
                const files = fs.readdirSync(sheetsDir);
                const jsFiles = files.filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));

                const questionsFilePath = path.resolve(__dirname, 'src/data/questions.js');
                let importBlock = '';
                let exportBlock = 'export const super100Sheets = {\n';

                jsFiles.forEach((key, idx) => {
                  importBlock += `import { ${key} } from './sheets/${key}';\n`;
                  exportBlock += `  ${key}${idx < jsFiles.length - 1 ? ',' : ''}\n`;
                });
                exportBlock += '};\n';

                fs.writeFileSync(questionsFilePath, `${importBlock}\n${exportBlock}`, 'utf8');

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          }
          
          // ==========================================
          // 2. DELETE SHEET ENDPOINT
          // ==========================================
          else if (isPost && urlPath === '/api/delete-sheet') {
            let body = '';
            
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', () => {
              try {
                const { sheetId } = JSON.parse(body);
                
                if (!sheetId) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing sheetId.' }));
                  return;
                }

                const sheetsDir = path.resolve(__dirname, 'src/data/sheets');
                const sheetFilePath = path.join(sheetsDir, `${sheetId}.js`);

                if (fs.existsSync(sheetFilePath)) {
                  fs.unlinkSync(sheetFilePath);
                }

                // Re-generate main questions.js index
                const files = fs.readdirSync(sheetsDir);
                const jsFiles = files.filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));

                const questionsFilePath = path.resolve(__dirname, 'src/data/questions.js');
                let importBlock = '';
                let exportBlock = 'export const super100Sheets = {\n';

                jsFiles.forEach((key, idx) => {
                  importBlock += `import { ${key} } from './sheets/${key}';\n`;
                  exportBlock += `  ${key}${idx < jsFiles.length - 1 ? ',' : ''}\n`;
                });
                exportBlock += '};\n';

                fs.writeFileSync(questionsFilePath, `${importBlock}\n${exportBlock}`, 'utf8');

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: `Sheet successfully deleted!` }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          }
          
          else {
            next();
          }
        });
      }
    }
  ],
  build: {
    // Production build optimizations
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true
  }
})
