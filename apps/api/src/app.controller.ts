import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'health', version: '1' })
export class AppController {
  @Get()
  getHealth() {
    return {
      data: {
        service: 'sirohi-api',
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
