import { describe, it, expect } from 'vitest';

import { parseSdnAddresses } from './ofac-screener.service';

const SDN_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<sdnList xmlns="http://tempuri.org/sdnList.xsd">
  <publishInformation>
    <Publish_Date>2026-05-15</Publish_Date>
  </publishInformation>
  <sdnEntry>
    <uid>12345</uid>
    <lastName>TORNADO CASH</lastName>
    <sdnType>Entity</sdnType>
    <programList>
      <program>CYBER2</program>
      <program>SDGT</program>
    </programList>
    <idList>
      <id>
        <uid>1</uid>
        <idType>Digital Currency Address - ETH</idType>
        <idNumber>0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936</idNumber>
      </id>
      <id>
        <uid>2</uid>
        <idType>Digital Currency Address - USDC</idType>
        <idNumber>0x8589427373D6D84E98730D7795D8f6f8731FDA16</idNumber>
      </id>
    </idList>
    <publishInformation>
      <Date_Published>2022-08-08</Date_Published>
    </publishInformation>
  </sdnEntry>
  <sdnEntry>
    <uid>67890</uid>
    <lastName>BENIGN CORP</lastName>
    <sdnType>Entity</sdnType>
    <programList>
      <program>SDGT</program>
    </programList>
    <idList>
      <id>
        <uid>3</uid>
        <idType>Passport</idType>
        <idNumber>A12345678</idNumber>
      </id>
    </idList>
  </sdnEntry>
  <sdnEntry>
    <uid>11111</uid>
    <lastName>BTC SANCTIONED</lastName>
    <sdnType>Individual</sdnType>
    <programList>
      <program>CYBER2</program>
    </programList>
    <idList>
      <id>
        <uid>4</uid>
        <idType>Digital Currency Address - XBT</idType>
        <idNumber>1Mz7153HMuxXTuR2R1t78mGSdzaAtNbBWX</idNumber>
      </id>
    </idList>
    <publishInformation>
      <Date_Published>2024-01-15</Date_Published>
    </publishInformation>
  </sdnEntry>
</sdnList>`;

describe('parseSdnAddresses', () => {
  it('extracts only digital-currency-address entries', () => {
    const entries = parseSdnAddresses(SDN_FIXTURE);
    const addresses = entries.map(e => e.address).sort();
    expect(addresses).toEqual([
      '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936',
      '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
      '1Mz7153HMuxXTuR2R1t78mGSdzaAtNbBWX',
    ]);
  });

  it('attaches the parent entry programs', () => {
    const entries = parseSdnAddresses(SDN_FIXTURE);
    const tornadoEth = entries.find(
      e => e.address === '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936'
    );
    expect(tornadoEth?.programs).toContain('CYBER2');
    expect(tornadoEth?.programs).toContain('SDGT');
  });

  it('parses listed date from Date_Published', () => {
    const entries = parseSdnAddresses(SDN_FIXTURE);
    const tornadoEth = entries.find(
      e => e.address === '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936'
    );
    expect(tornadoEth?.listedTs).toBe(
      Math.floor(Date.parse('2022-08-08') / 1000)
    );
  });

  it('ignores non-crypto idTypes', () => {
    const entries = parseSdnAddresses(SDN_FIXTURE);
    expect(entries.find(e => e.address === 'A12345678')).toBeUndefined();
  });

  it('returns an empty array for malformed XML', () => {
    expect(parseSdnAddresses('<not><valid></not>')).toEqual([]);
    expect(parseSdnAddresses('')).toEqual([]);
  });
});
