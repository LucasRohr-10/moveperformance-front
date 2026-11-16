import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { SectionLabel } from "@/components/ui/section-label";
import { CONTACT } from "@/features/location";

export const metadata: Metadata = {
  title: "Política de privacidad · MOVE",
};

const LAST_UPDATE = "12 de noviembre de 2026";
const GOOGLE_USER_DATA_POLICY_URL = "https://developers.google.com/terms/api-services-user-data-policy";
const URCDP_COMPLAINT_URL =
  "https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp";

const BODY = "text-sm leading-relaxed text-muted";
const LIST = "mt-3 list-disc space-y-2 pl-5";
const LINK = "underline underline-offset-4";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={LINK} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function WhatsappLink() {
  return (
    <a href={CONTACT.whatsapp.href} className={LINK} target="_blank" rel="noopener noreferrer">
      {CONTACT.whatsapp.label}
    </a>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <Heading as="h2" size="sm">
        {title}
      </Heading>
      <div className={`mt-4 space-y-3 ${BODY}`}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-soft">
        <PageContainer className="pb-14 pt-20">
          <SectionLabel>Legal</SectionLabel>
          <Heading as="h1" size="lg" className="mt-5 text-5xl md:text-6xl">
            Política de privacidad
          </Heading>
          <p className={`mt-6 max-w-2xl ${BODY}`}>
            Acá te contamos qué datos tuyos guarda MOVE, para qué los usamos, con quién los
            compartimos y cómo podés ejercer tus derechos, según la Ley 18.331 de protección de
            datos personales de Uruguay.
          </p>
        </PageContainer>
      </section>

      <section className="border-t border-line">
        <PageContainer className="max-w-3xl pb-20 pt-4">
          <PolicySection title="Quiénes somos y cómo contactarnos">
            <p>
              MOVE Strength &amp; Conditioning (MOVE) es el responsable de la base de datos donde
              se guardan tus datos personales. Estamos en {CONTACT.address}.
            </p>
            <p>
              Para cualquier consulta o pedido sobre tus datos, escribinos por WhatsApp al{" "}
              <WhatsappLink />.
            </p>
          </PolicySection>

          <PolicySection title="Qué datos recolectamos">
            <ul className={LIST}>
              <li>
                <strong>Tu cuenta:</strong> nombre, apellido, email, teléfono, fecha de nacimiento
                y, si entrás con Google, tu foto. Si te registrás con email, guardamos tu contraseña
                en forma cifrada.
              </li>
              <li>
                <strong>Tu actividad en MOVE:</strong> tu plan y sus fechas, las reservas que hacés
                y cancelás, y tu asistencia.
              </li>
              <li>
                <strong>Tus pagos:</strong> las compras, los montos, el estado y el método de pago,
                el identificador del pago en Mercado Pago y, en pagos en efectivo o transferencia
                registrados por el equipo, el comprobante. No guardamos el número de tu tarjeta ni
                datos bancarios: los procesa Mercado Pago.
              </li>
              <li>
                <strong>Comunicaciones:</strong> los mails que te enviamos, los avisos y
                comunicados que leés y los saludos de cumpleaños.
              </li>
              <li>
                <strong>Datos técnicos:</strong> la dirección IP y el navegador de tus sesiones.
              </li>
              <li>
                <strong>Seguimiento:</strong> lo que se explica más abajo, en &ldquo;Datos de
                seguimiento y salud&rdquo;.
              </li>
            </ul>
            <p>
              Para crear tu cuenta, reservar y pagar necesitamos tu nombre, apellido, email,
              teléfono y fecha de nacimiento. Si no nos los das, no podemos darte de alta ni
              gestionar tus reservas. Tu foto es opcional: solo la recibimos si entrás con Google.
            </p>
          </PolicySection>

          <PolicySection title="Para qué usamos tus datos">
            <ul className={LIST}>
              <li>Crear y reconocer tu cuenta.</li>
              <li>Gestionar tu plan, tus reservas y tu asistencia.</li>
              <li>Cobrar tus planes y procesar los débitos automáticos que actives.</li>
              <li>
                Enviarte mails y avisos del servicio, como la confirmación de tu cuenta, los
                recordatorios y los avisos de vencimiento del plan.
              </li>
              <li>Acompañar tu progreso con el seguimiento del equipo.</li>
              <li>Saludarte en tu cumpleaños.</li>
              <li>Organizar la agenda del equipo.</li>
              <li>Cuidar la seguridad de tu cuenta.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Datos de Google">
            <p>
              <strong>Si entrás con Google:</strong> recibimos tu nombre, apellido, email y foto.
              Los usamos solo para crear y reconocer tu cuenta.
            </p>
            <p>
              <strong>Google Calendar:</strong> solo la persona de Staff que conecta su calendario
              le da a MOVE permiso para ver y modificar eventos de ese calendario. Los clientes no
              dan acceso a su calendario. Lo usamos para dos cosas:
            </p>
            <ul className={LIST}>
              <li>
                Crear en ese calendario un evento por cada reserva de Rehab. El evento lleva el
                nombre del cliente y el tipo de sesión.
              </li>
              <li>Bloquear en MOVE los horarios en que ese calendario tiene un evento.</li>
            </ul>
            <p>
              Guardamos el email de la cuenta de Google conectada, el calendario elegido y una
              credencial de acceso cifrada. Quien conectó su calendario puede quitarle el permiso a
              MOVE en cualquier momento desde su cuenta de Google.
            </p>
            <p>
              Usamos la información que recibimos de Google solo para ofrecer estas funciones. No
              la vendemos, no la usamos para publicidad y no la compartimos con otras personas,
              salvo para dar el servicio, por seguridad o si la ley lo exige.
            </p>
            <p>
              El uso que hace MOVE de la información recibida de las APIs de Google cumple con la{" "}
              <ExternalLink href={GOOGLE_USER_DATA_POLICY_URL}>
                Política de datos de usuario de los servicios de las APIs de Google
              </ExternalLink>
              , incluidos los requisitos de uso limitado.
            </p>
          </PolicySection>

          <PolicySection title="Datos de seguimiento y salud">
            <p>
              Como parte del seguimiento, el equipo puede guardar tus respuestas sobre cómo te
              sentís, si tenés dolor (con un detalle escrito) y si querés ajustar tus objetivos.
              También guarda notas de los contactos que tuvo con vos y, si dejás de venir un
              tiempo, el motivo, por ejemplo una lesión.
            </p>
            <p>
              Estos datos pueden ser datos de salud, que la ley uruguaya considera sensibles. Solo
              los ve el equipo de MOVE y los usamos para acompañarte en tu entrenamiento. Nadie
              está obligado a dar datos sensibles. Si no querés que guardemos alguno, avisanos.
            </p>
          </PolicySection>

          <PolicySection title="Con quién compartimos tus datos">
            <p>
              Para dar el servicio usamos estos proveedores, que reciben solo los datos que
              necesitan:
            </p>
            <ul className={LIST}>
              <li>
                <strong>Mercado Pago:</strong> cobros y débitos automáticos. Recibe los datos
                necesarios para procesar el pago.
              </li>
              <li>
                <strong>Brevo:</strong> envío de mails. Recibe tu email, tu nombre y el contenido
                del mail.
              </li>
              <li>
                <strong>Google:</strong> inicio de sesión y calendario del equipo, como se explica
                arriba.
              </li>
              <li>
                <strong>Neon y Amazon Web Services:</strong> guardan la base de datos y ejecutan el
                servidor de MOVE.
              </li>
              <li>
                <strong>Vercel:</strong> aloja este sitio web.
              </li>
            </ul>
            <p>
              No vendemos tus datos ni los usamos para publicidad. Solo los compartimos con estos
              proveedores para prestarte el servicio, o si una ley o una autoridad nos lo exige.
            </p>
          </PolicySection>

          <PolicySection title="Transferencia internacional de datos">
            <p>
              Algunos de estos proveedores pueden guardar o procesar datos fuera de Uruguay. La ley
              uruguaya permite estas transferencias cuando el país o la empresa ofrecen un nivel de
              protección adecuado, o cuando son necesarias para prestar el servicio. Esta
              transferencia es necesaria para prestarte el servicio de MOVE.
            </p>
          </PolicySection>

          <PolicySection title="Cuánto tiempo guardamos tus datos">
            <p>
              Guardamos tus datos mientras tengas una cuenta en MOVE y, después, durante el tiempo
              necesario para cumplir obligaciones legales y resolver reclamos. Si pedís que
              borremos tus datos, los borramos, salvo los que la ley nos obligue a conservar.
            </p>
          </PolicySection>

          <PolicySection title="Seguridad">
            <ul className={LIST}>
              <li>Las contraseñas se guardan cifradas.</li>
              <li>Cada persona accede solo a lo que le corresponde según su rol: cliente o Staff.</li>
              <li>La conexión con MOVE es cifrada.</li>
              <li>La credencial de acceso al calendario del equipo se guarda cifrada.</li>
            </ul>
            <p>Ningún sistema es totalmente invulnerable, pero cuidamos tus datos con esas medidas.</p>
          </PolicySection>

          <PolicySection title="Tus derechos">
            <p>
              Podés pedirnos acceso a tus datos, que los rectifiquemos, los actualicemos, los
              incluyamos o los suprimamos. Escribinos por WhatsApp al <WhatsappLink /> y te
              respondemos en un máximo de 5 días hábiles. Los pedidos de rectificación,
              actualización, inclusión y supresión no tienen costo. El de acceso es gratuito una
              vez cada seis meses.
            </p>
          </PolicySection>

          <PolicySection title="Cómo hacer un reclamo">
            <p>
              Si no respondemos tu pedido o no estás conforme, podés presentar una denuncia ante la
              Unidad Reguladora y de Control de Datos Personales (URCDP), con el{" "}
              <ExternalLink href={URCDP_COMPLAINT_URL}>formulario de denuncias de la URCDP</ExternalLink>
              .
            </p>
          </PolicySection>

          <PolicySection title="Cookies y sesión">
            <p>
              Usamos cookies solo para mantener tu sesión iniciada y cuidar la seguridad de tu
              cuenta. No usamos cookies de publicidad ni herramientas de analítica de terceros.
            </p>
          </PolicySection>

          <PolicySection title="Cambios a esta política">
            <p>
              Última actualización: {LAST_UPDATE}. Si cambiamos cómo usamos tus datos, actualizamos
              esta página y, cuando el cambio sea importante, te avisamos en la app o por mail.
            </p>
          </PolicySection>
        </PageContainer>
      </section>
    </>
  );
}
