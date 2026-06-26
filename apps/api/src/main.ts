import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000'

  app.enableCors({
    origin: frontendUrl,
    credentials: false
  })

  await app.listen(Number(process.env.API_PORT || 3001), '127.0.0.1')
}

void bootstrap()
