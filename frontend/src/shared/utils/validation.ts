import { CoinCode } from '../types';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isBase58(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (!BASE58_ALPHABET.includes(str[i])) {
      return false;
    }
  }
  return true;
}

export function validateWalletAddress(coin: CoinCode, address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!clean) {
    return { isValid: false, error: 'Wallet address is required.' };
  }

  switch (coin) {
    case 'USDT_TRC20':
      if (clean.length !== 34 || !clean.startsWith('T') || !isBase58(clean)) {
        return { isValid: false, error: 'Invalid TRC-20 address. Must start with "T" and be exactly 34 characters.' };
      }
      break;

    case 'SOL':
      if (clean.length < 32 || clean.length > 44 || !isBase58(clean)) {
        return { isValid: false, error: 'Invalid Solana address. Must be a valid 32-44 character Base58 string.' };
      }
      break;

    case 'BNB':
    case 'USDC_BASE':
      if (clean.length !== 42 || !clean.startsWith('0x') || !/^0x[0-9a-fA-F]{40}$/.test(clean)) {
        return { isValid: false, error: 'Invalid address. Must start with "0x" followed by 40 hex characters.' };
      }
      break;

    case 'BTC':
      if (clean.startsWith('bc1')) {
        if (clean.length < 42 || clean.length > 62 || !/^bc1[a-z0-9]{39,59}$/i.test(clean)) {
          return { isValid: false, error: 'Invalid Bitcoin Bech32/Taproot SegWit address.' };
        }
      } else if (clean.startsWith('1') || clean.startsWith('3')) {
        if (clean.length < 26 || clean.length > 35 || !isBase58(clean)) {
          return { isValid: false, error: 'Invalid Bitcoin Legacy/P2SH address format.' };
        }
      } else {
        return { isValid: false, error: 'Invalid Bitcoin address. Must start with bc1, 1, or 3.' };
      }
      break;

    default:
      return { isValid: false, error: 'Unsupported coin type.' };
  }

  return { isValid: true };
}

export function validateCryptoAddress(address: string, networkOrCoin: string): { valid: boolean; error?: string } {
  // Normalize coin code
  let coin: CoinCode = 'USDT_TRC20';
  const upper = networkOrCoin.toUpperCase();
  if (upper.includes('TRC') || upper.includes('TRON')) coin = 'USDT_TRC20';
  else if (upper.includes('SOL')) coin = 'SOL';
  else if (upper.includes('BNB') || upper.includes('BEP')) coin = 'BNB';
  else if (upper.includes('BASE')) coin = 'USDC_BASE';
  else if (upper.includes('BTC') || upper.includes('BITCOIN')) coin = 'BTC';

  const res = validateWalletAddress(coin, address);
  return { valid: res.isValid, error: res.error };
}
