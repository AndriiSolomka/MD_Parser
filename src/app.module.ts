import { Module } from "@nestjs/common";
import { ConverterModule } from "./converter/converter.module";

@Module({
  imports: [ConverterModule],
})
export class AppModule {}
