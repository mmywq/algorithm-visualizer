import { brand } from '@/config/brand';
import { getSupabase } from '@/lib/supabase';

export interface LicenseRequest {
  readonly name: string;
  readonly organization: string;
  readonly role: string;
  readonly email: string;
  readonly phone: string;
  readonly students: string;
  readonly message: string;
}

export type LeadResult = { readonly ok: true; readonly via: 'cloud' | 'email' } | { readonly ok: false; readonly error: string };

/**
 * Заявка на лицензию: в облачном режиме сохраняется в таблицу license_requests,
 * иначе открывается письмо на контактный адрес. Если не настроено ни то ни другое,
 * форма честно сообщает, что заявку отправить нельзя.
 */
export const submitLicenseRequest = async (request: LicenseRequest): Promise<LeadResult> => {
  const client = await getSupabase();
  if (client !== null) {
    const { error } = await client.from('license_requests').insert({
      name: request.name,
      organization: request.organization,
      role: request.role,
      email: request.email,
      phone: request.phone,
      students: request.students,
      message: request.message,
    });
    return error === null ? { ok: true, via: 'cloud' } : { ok: false, error: 'Не удалось отправить заявку. Попробуйте ещё раз чуть позже.' };
  }
  if (brand.contactEmail.length > 0) {
    const body = [
      `Имя: ${request.name}`,
      `Организация: ${request.organization}`,
      `Должность: ${request.role}`,
      `Почта: ${request.email}`,
      `Телефон: ${request.phone}`,
      `Число студентов: ${request.students}`,
      '',
      request.message,
    ].join('\n');
    window.location.href = `mailto:${brand.contactEmail}?subject=${encodeURIComponent(`Заявка на лицензию — ${request.organization}`)}&body=${encodeURIComponent(body)}`;
    return { ok: true, via: 'email' };
  }
  return { ok: false, error: 'Приём заявок пока не настроен на этом сайте.' };
};
