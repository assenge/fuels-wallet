import { getButtonByText, hasText } from '@fuels/playwright-utils';
import type { FuelWalletTestHelper } from '@fuels/playwright-utils';
import { expect } from '@playwright/test';
import type { WalletUnlocked } from 'fuels';
import { bn, toBech32 } from 'fuels';

import '../../load.envs.js';
import { getBaseAssetId, shortAddress } from '../../src/utils';
import { testSetup } from '../utils';

import { MAIN_CONTRACT_ID } from './config';
import { test, useLocalCRX } from './test';
import { checkAddresses, checkFee, connect } from './utils';

useLocalCRX();

test.describe('Deposit Half ETH', () => {
  let fuelWalletTestHelper: FuelWalletTestHelper;
  let fuelWallet: WalletUnlocked;
  test.beforeEach(async ({ context, extensionId, page }) => {
    ({ fuelWalletTestHelper, fuelWallet } = await testSetup({
      context,
      page,
      extensionId,
    }));
  });

  test('e2e deposit half eth', async ({ page }) => {
    await connect(page, fuelWalletTestHelper);

    const depositAmount = '1.000';
    const halfDepositAmount = '0.500';
    const depositHalfInput = page
      .getByLabel('Deposit half eth card')
      .locator('input');
    await depositHalfInput.fill(depositAmount);

    const depositHalfButton = getButtonByText(page, 'Deposit Half ETH', true);

    await page.waitForTimeout(3000);
    await depositHalfButton.click();

    const walletNotificationPage =
      await fuelWalletTestHelper.getWalletPopupPage();

    // test forward asset name is shown
    await hasText(walletNotificationPage, 'Ethereum');
    // test forward asset id is shown
    await hasText(walletNotificationPage, shortAddress(await getBaseAssetId()));
    // test forward eth amount is correct
    await hasText(walletNotificationPage, `${depositAmount} ETH`);

    // test return asset name is shown
    await hasText(walletNotificationPage, 'Ethereum', 1);
    // test return asset id is shown
    await hasText(
      walletNotificationPage,
      shortAddress(await getBaseAssetId()),
      1
    );
    // test return eth amount is correct
    await hasText(walletNotificationPage, `${halfDepositAmount} ETH`);

    // test gas fee is shown and correct
    await hasText(walletNotificationPage, 'Fee (network)');
    // const fee = bn.parseUnits('0.000002616');
    // await checkFee(walletNotificationPage, {
    //   minFee: fee.sub(100),
    //   maxFee: fee.add(100),
    // });

    // test to and from addresses
    const fuelContractId = toBech32(MAIN_CONTRACT_ID);
    await checkAddresses(
      { address: fuelWallet.address.toAddress(), isContract: false },
      { address: fuelContractId, isContract: true },
      walletNotificationPage
    );
    await checkAddresses(
      { address: fuelContractId, isContract: true },
      { address: fuelWallet.address.toAddress(), isContract: false },
      walletNotificationPage
    );

    // Test approve
    const preDepositBalanceEth = await fuelWallet.getBalance();
    await fuelWalletTestHelper.walletApprove();
    await hasText(page, 'Transaction successful.');
    const postDepositBalanceEth = await fuelWallet.getBalance();
    expect(
      Number.parseFloat(
        preDepositBalanceEth
          .sub(postDepositBalanceEth)
          .format({ precision: 5, units: 9 })
      )
    ).toBe(Number.parseFloat(halfDepositAmount));
  });
});
