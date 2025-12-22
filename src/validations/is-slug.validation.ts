import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isString } from 'lodash';

export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSlug',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!isString(value)) return false;
          return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(value);
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid slug (alphanumeric with optional hyphens/underscores)`;
        },
      },
    });
  };
}
