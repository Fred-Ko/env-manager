import { Body, Controller, Get, Post, Param, HttpException, HttpStatus, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('secrets')
  async createSecret(
    @Body() body: { accessKeyId: string; secretAccessKey: string; region: string }
  ) {
    await this.appService.login(body.accessKeyId, body.secretAccessKey, body.region);
    return { message: 'Credentials set successfully' };
  }

  @Get('secrets')
  async getSecrets(@Body() body: { query?: string }) {
    return this.appService.getSecrets(body.query);
  }

  @Post('updateSecret')
  async updateSecret(
    @Body() body: Array<{ secretName: string; jmsPaths: string[]; newValues: string[] }>
  ) {
    const results = [];

    for (const item of body) {
      const result = await this.appService.updateSecret(
        item.secretName,
        item.jmsPaths,
        item.newValues
      );
      results.push(result);
    }
    return results;
  }
}
