import { Controller, Get } from '@nestjs/common';
import { AppService, Block } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): any {
    return this.appService.spin();
  }

  @Get('testBonus')
  testBonus(): any {
    const avg = [];
    for (let i = 0; i < 1000; i++) {
      let spinCount = 0;
      let spinResult:
        | {
            bonus: boolean;
            reels: any[];
            blocks: Block[];
          }
        | undefined = undefined;
      do {
        spinResult = this.appService.spin();
        spinCount++;
      } while (spinResult.bonus === false);
      avg.push(spinCount);
    }

    return {
      avg: avg.reduce((a, b) => a + b, 0) / avg.length,
      spins: avg.reduce((a, b) => a + b, 0),
    };
  }

  @Get('findBonus')
  async findBonus(): Promise<any> {
    let spinCount = 0;
    let spinResult:
      | {
          bonus: boolean;
          reels: any[];
          blocks: Block[];
        }
      | undefined = undefined;
    do {
      spinResult = this.appService.spin();
      spinCount++;

      if (spinCount % 10000 === 0) {
        console.log(spinCount);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (spinResult.bonus === false);

    return {
      spinCount,
      spinResult,
    };
  }
}
