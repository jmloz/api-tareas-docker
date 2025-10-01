FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando simple sin nodemon
CMD ["node", "src/index.js"]