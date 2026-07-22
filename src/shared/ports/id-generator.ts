import { v4 as uuidv4 } from 'uuid';

export interface IdGenerator {
  next(): string;
}

export const uuidIdGenerator: IdGenerator = {
  next: () => uuidv4(),
};
