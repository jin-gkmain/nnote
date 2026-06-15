import { IsIn } from 'class-validator';

export class UpdateInquiryStatusDto {
  @IsIn(['pending', 'in_progress', 'completed'])
  status: 'pending' | 'in_progress' | 'completed';
}
