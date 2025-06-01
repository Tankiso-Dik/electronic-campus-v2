// app/page.js
import Link from 'next/link'; // For client-side routing on navigation links
import Chatbot from './chatbot/Chatbot'; // Import the Chatbot client component

export default function HomePage() {
  return (
      <>
        <table width='100%' border='0' cellSpacing='0' cellPadding='2'>
          <tbody>{/* tbody is required for valid HTML tables in JSX */}
          <tr>
            <td className='a12' width='15%'>
              <b>VISITOR<br/>21:20:45 26th Apr 2025<br/>168.172.67.250<br/></b>
            </td>
            <td width="70%" align="center"><img src="/themes/default/def-ec.png" alt="Electronic Campus Logo"/></td>
            <td className="a12" width="15%" align="right">
              <Link href='/ldapLogin.html'>[ Login ]</Link><br/>
              <Link href='/logout.html'>[ Logout ]</Link>
            </td>
          </tr>
          </tbody>
        </table>

        <hr width="780"/>

        <table align='center' border='0' cellSpacing='2' cellPadding='1'>
          <tbody>{/* tbody is required for valid HTML tables in JSX */}
          <tr>
            <td className='Xbody'><Link href='/start9883.html'>[News]</Link></td>
            <td className='Xbody'><Link href='/study/main7984.html'>[Study Guides]</Link></td>
            <td className='Xbody'><Link href='/prescriptions/indexb039.html'>[Subject Prescriptions]</Link></td>
            <td className='Xbody'><Link href='/exclusionsb4c0.html'>[Exclusions]</Link></td>
            <td className='Xbody'><Link href='/eTransfersbe2a.html'>[eTransfers]</Link></td>
            <td className='Xbody'><Link href='/misc/bsAccess2bc6.html'>[B.S. Access]</Link></td>
            <td className='a12'><b>(Student)</b></td>
            <td className='a12'><b>(Staff)</b></td>
          </tr>
          </tbody>
        </table>

        <hr/>

        <table className='strip' width='1020' align='center' border='0' cellSpacing='2' cellPadding='3'>
          <thead>{/* thead is required for valid HTML tables in JSX */}
          <tr align='center'><td className='a14' width='16%'><b>Date</b></td><td className='a14' width='84%'><b>News Event</b></td></tr>
          </thead>
          <tbody>
          <tr>
            <td className='Xbody' align='right'><sub>10:01</sub> Tue 15th Apr 2025<br/>Tj Ramabu</td>
            <td className='Xbody'>
              Dear students in the faculty of ICT<br/>Stand a chance for an all-cost-included trip to Germany (for HPC conference).<br/>Fill the Google sheet.<br/>
              <span style={{float:'right'}}><a href='/lib/HPC_competitionee4c.pdf'>{'{Download File}'}</a></span>
            </td>
          </tr>
          <tr>
            <td className='Xbody' align='right'><sub>19:08</sub> Mon 14th Apr 2025<br/>WV Kambale</td>
            <td className='Xbody'>
              Semester Test 2 Timetables Final.<br/>
              <span style={{float:'right'}}><a href='/lib/Faculty_of_ICT_Semester_Test_2_2025_S1_(ALL)_FINALfaa1.xlsx'>{'{Download File}'}</a></span>
            </td>
          </tr>
          <tr>
            <td className='Xbody' align='right'><sub>10:46</sub> Fri 11th Apr 2025<br/>Vwa Memani</td>
            <td className='Xbody'>
              DIRISA Datathon Roadshows.<br/>
              <span style={{float:'right'}}><a href='/lib/Flyer_for_DIRISA_Datathon_Roadshows5bc4.pdf'>{'{Download File}'}</a></span>
            </td>
          </tr>
          </tbody>
        </table>

        <hr width="100%"/>

        <Chatbot />
      </>
  );
}