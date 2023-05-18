import { Injectable } from '@nestjs/common';

// const symbolChance = {
//   red: 100,
//   green: 100,
//   blue: 100,
//   yellow: 100,
//   orange: 100,
//   purple: 100,
//   pink: 100,
//   wild: 5,
//   bonus: 1,
// };

const WILD_SYMBOL = 'WIL';
const BONUS_SYMBOL = 'BON';
const symbolChance = {
  LV1: 1000,
  LV2: 1000,
  LV3: 1000,
  LV4: 1000,
  LV5: 1000,
  LV6: 1000,
  LV7: 1000,
  [WILD_SYMBOL]: 50,
  [BONUS_SYMBOL]: 50,
};

const NUMBER_OF_REELS = 8;
const SYMBOLS_PER_REEL = 6;
const MIN_BLOCK_CRUSH_SIZE = 5;
const MIN_BONUS_ENTER_COUNT = 3;

export interface Block {
  type: string;
  nodes: { x: number; y: number }[];
  level: number;
}

export interface Node {
  type: string;
  y: number;
  x: number;
}

@Injectable()
export class AppService {
  protected totalCandies = Object.values(symbolChance).reduce(
    (a, b) => a + b,
    0,
  );

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomSymbol(): string {
    const randomInt = this.randomInt(0, this.totalCandies);
    let count = 0;
    return Object.keys(symbolChance).find((name) => {
      if (count + symbolChance[name] >= randomInt) {
        return name;
      }
      count += symbolChance[name];
    });
  }

  getReelSymbols(numberOfSymbols: number): string[] {
    return Array(numberOfSymbols)
      .fill(0)
      .map(() => {
        return this.getRandomSymbol();
      });
  }

  spin() {
    const reels = [];
    // console.log('---------------------');
    Array(NUMBER_OF_REELS)
      .fill(0)
      .map(() => {
        const reel = this.getReelSymbols(SYMBOLS_PER_REEL);
        reels.push(reel);
      });
    const initialReels = JSON.parse(JSON.stringify(reels));
    const blocks = this.findBlocks(reels);
    const addedReelSymbols = Array(NUMBER_OF_REELS)
      .fill(0)
      .map(() => []);
    this.replaceBlockSymbols(reels, blocks, addedReelSymbols);

    let newBlocks: Block[] = [];
    let blockLevel = 1;
    do {
      newBlocks = this.findBlocks(reels, blockLevel);
      this.replaceBlockSymbols(reels, newBlocks, addedReelSymbols);
      blocks.push(...newBlocks);
      blockLevel++;
    } while (newBlocks.length > 0);

    // console.log('initialReels', initialReels);
    // blocks.map((block) => {
    //   console.log('block', block);
    // });

    // console.log('reels', reels);
    // console.log('addedReelSymbols', addedReelSymbols);

    const fullReels = initialReels.map((initReel, index) => {
      return [...addedReelSymbols[index], ...initReel];
    });

    const canEnterBonus = this.canEnterBonus(fullReels);

    return {
      bonus: canEnterBonus,
      reels: fullReels,
      blocks: [...blocks, ...newBlocks],
    };
  }

  canEnterBonus(reels: string[][]): boolean {
    let bonusCount = 0;
    reels.forEach((reel) => {
      reel.forEach((symbol) => {
        if (symbol === BONUS_SYMBOL) {
          bonusCount++;
        }
      });
    });
    return bonusCount >= MIN_BONUS_ENTER_COUNT;
  }

  replaceBlockSymbols(
    reels: string[][],
    blocks: Block[],
    addedReelSymbols: string[][],
  ): void {
    blocks.forEach((block) => {
      block.nodes.forEach((node) => {
        const newSymbol = this.getRandomSymbol();
        reels[node.x].splice(node.y, 1);
        reels[node.x].unshift(newSymbol);
        addedReelSymbols[node.x].unshift(newSymbol);
      });
    });
  }

  // find block of 5 or more symbols next to each other
  findBlocks(reels: string[][], blockLevel = 0): Block[] {
    const blocks = [];

    Object.keys(symbolChance).forEach((symbol) => {
      if (symbol == WILD_SYMBOL || symbol === BONUS_SYMBOL) return;

      // clear all other symbols
      let clearedReels = reels.map((reel) => {
        return reel.map((symbolName) => {
          if (symbolName == WILD_SYMBOL) {
            return WILD_SYMBOL;
          }

          return symbolName === symbol ? symbol : undefined;
        });
      });

      // clear single symbols
      clearedReels = clearedReels.map((reel, reelIndex) => {
        return reel.map((symbolName, index) => {
          if (symbolName !== undefined) {
            if (
              reel[index - 1] === undefined &&
              reel[index + 1] === undefined &&
              clearedReels[reelIndex - 1]?.[index] === undefined &&
              clearedReels[reelIndex + 1]?.[index] === undefined
            ) {
              return undefined;
            }
          }
          return symbolName;
        });
      });

      // find blocks for each symbol
      clearedReels.forEach((reel, reelIndex) => {
        reel.forEach((symbolName, index) => {
          if (symbolName !== undefined) {
            const nodes = this.findNodes(clearedReels, reelIndex, index);

            // Filter out PURE wilds and bonus symbols blocks
            const symbolType = nodes.find(
              (node) => [WILD_SYMBOL, BONUS_SYMBOL].indexOf(node.type) === -1,
            )?.type;

            if (!symbolType) {
              return;
            }

            if (
              this.isPartOfBlock(blocks, reelIndex, index) === false &&
              nodes.length >= MIN_BLOCK_CRUSH_SIZE
            ) {
              blocks.push({
                type: symbolType,
                nodes: nodes,
                level: blockLevel,
              });
            }
          }
        });
      });
    });

    return blocks;
  }

  isPartOfBlock(blocks, x, y): boolean {
    return (
      blocks.findIndex((block) => {
        return (
          block.nodes.findIndex((node) => {
            return node.x === x && node.y === y;
          }) !== -1
        );
      }) !== -1
    );
  }

  findNodes(reels, x, y, newNodes = []): Node[] {
    const nodes = newNodes;

    if (reels?.[x - 1]?.[y] !== undefined) {
      if (this.isNewNode(nodes, x - 1, y)) {
        nodes.push({ x: x - 1, y: y, type: reels[x - 1][y] });
        this.findNodes(reels, x - 1, y, nodes);
      }
    }
    if (reels?.[x + 1]?.[y] !== undefined) {
      if (this.isNewNode(nodes, x + 1, y)) {
        nodes.push({ x: x + 1, y: y, type: reels[x + 1][y] });
        this.findNodes(reels, x + 1, y, nodes);
      }
    }
    if (reels?.[x]?.[y - 1] !== undefined) {
      if (this.isNewNode(nodes, x, y - 1)) {
        nodes.push({ x: x, y: y - 1, type: reels[x][y - 1] });
        this.findNodes(reels, x, y - 1, nodes);
      }
    }
    if (reels?.[x]?.[y + 1] !== undefined) {
      if (this.isNewNode(nodes, x, y + 1)) {
        nodes.push({ x: x, y: y + 1, type: reels[x][y + 1] });
        this.findNodes(reels, x, y + 1, nodes);
      }
    }

    return nodes;
  }

  isNewNode(nodes, x, y): boolean {
    return (
      nodes.findIndex((node) => {
        return node.x === x && node.y === y;
      }) === -1
    );
  }
}
