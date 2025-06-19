import { useMemo } from 'react';
import { toEther } from "thirdweb/utils";
import { useRewards, useCurrentPeriodInfo } from './useRewards';


export function useRewardsDisplay(userAddress?: string) {
  const rewardsData = useRewards(userAddress);
  const periodData = useCurrentPeriodInfo();

  const calculations = useMemo(() => {
    const {
      pendingEthRewards,
      pendingEmarkRewards,
      stakedAmount,
      periodEthRewards,
      periodEmarkRewards,
    } = rewardsData;

    const currentEthRewards = pendingEthRewards ? parseFloat(toEther(pendingEthRewards)) : 0;
    const currentEmarkRewards = pendingEmarkRewards ? parseFloat(toEther(pendingEmarkRewards)) : 0;
    const totalCurrentRewards = currentEthRewards + currentEmarkRewards;
    const stakedAmountNum = stakedAmount ? parseFloat(toEther(stakedAmount)) : 0;

    const periodEthNum = periodEthRewards ? parseFloat(toEther(periodEthRewards)) : 0;
    const periodEmarkNum = periodEmarkRewards ? parseFloat(toEther(periodEmarkRewards)) : 0;

    const secondsInWeek = 7 * 24 * 60 * 60;
    const secondsInMonth = 30 * 24 * 60 * 60;
    const secondsInYear = 365 * 24 * 60 * 60;
    
    const periodDuration = periodData.periodEnd - periodData.periodStart;
    const weeklyMultiplier = periodDuration > 0 ? secondsInWeek / periodDuration : 0;
    const monthlyMultiplier = periodDuration > 0 ? secondsInMonth / periodDuration : 0;
    const yearlyMultiplier = periodDuration > 0 ? secondsInYear / periodDuration : 0;

    const ethProjections = {
      weekly: periodEthNum * weeklyMultiplier,
      monthly: periodEthNum * monthlyMultiplier,
      yearly: periodEthNum * yearlyMultiplier,
    };

    const emarkProjections = {
      weekly: periodEmarkNum * weeklyMultiplier,
      monthly: periodEmarkNum * monthlyMultiplier,
      yearly: periodEmarkNum * yearlyMultiplier,
    };

    const ethAPR = stakedAmountNum > 0 && ethProjections.yearly > 0 
      ? (ethProjections.yearly / stakedAmountNum) * 100 
      : 0;
    
    const emarkAPR = stakedAmountNum > 0 && emarkProjections.yearly > 0 
      ? (emarkProjections.yearly / stakedAmountNum) * 100 
      : 0;

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 APR Calculation Debug:', {
        currentRewards: {
          pendingEthRewards: currentEthRewards,
          pendingEmarkRewards: currentEmarkRewards,
        },
        periodRewards: {
          periodEthRewards: periodEthNum,
          periodEmarkRewards: periodEmarkNum,
        },
        projections: {
          ethYearly: ethProjections.yearly,
          emarkYearly: emarkProjections.yearly,
        },
        apr: {
          ethAPR: ethAPR.toFixed(2) + '%',
          emarkAPR: emarkAPR.toFixed(2) + '%',
        },
        stakedAmount: stakedAmountNum,
        periodDuration: periodDuration + ' seconds',
        yearlyMultiplier: yearlyMultiplier.toFixed(2),
      });
    }

    return {
      current: {
        ethRewards: currentEthRewards,
        emarkRewards: currentEmarkRewards,
        totalRewards: totalCurrentRewards,
        hasClaimableRewards: totalCurrentRewards > 0.0001,
        hasEthRewards: currentEthRewards > 0.0001,
        hasEmarkRewards: currentEmarkRewards > 0.0001,
      },

      projections: {
        eth: ethProjections,
        emark: emarkProjections,
      },

      apr: {
        eth: ethAPR,
        emark: emarkAPR,
        combined: ethAPR + emarkAPR,
      },

      period: {
        ethPool: periodData.currentEthPool ? parseFloat(toEther(periodData.currentEthPool)) : 0,
        emarkPool: periodData.currentEmarkPool ? parseFloat(toEther(periodData.currentEmarkPool)) : 0,
        ethRate: periodData.currentEthRate ? parseFloat(toEther(periodData.currentEthRate)) : 0,
        emarkRate: periodData.currentEmarkRate ? parseFloat(toEther(periodData.currentEmarkRate)) : 0,
        timeUntilRebalance: periodData.timeUntilRebalance,
        periodProgress: periodData.periodEnd > periodData.periodStart 
          ? ((Date.now() / 1000 - periodData.periodStart) / (periodData.periodEnd - periodData.periodStart)) * 100
          : 0,
      },

      user: {
        stakedAmount: stakedAmountNum,
        periodEthRewards: periodEthNum,
        periodEmarkRewards: periodEmarkNum,
      },

      // 🔧 FIXED: Better default decimal places for each token type
      format: {
        ethRewards: (decimals = 4) => currentEthRewards.toFixed(decimals),
        emarkRewards: (decimals = 2) => currentEmarkRewards.toFixed(decimals),  
        totalRewards: (decimals = 2) => totalCurrentRewards.toFixed(decimals),
        stakedAmount: (decimals = 2) => stakedAmountNum.toFixed(decimals),
        ethAPR: (decimals = 2) => ethAPR.toFixed(decimals), 
        emarkAPR: (decimals = 2) => emarkAPR.toFixed(decimals), 
        
        // 🔧 NEW: Additional formatting helpers for consistent display
        ethRewardsDisplay: () => currentEthRewards.toFixed(4),
        emarkRewardsDisplay: () => currentEmarkRewards.toFixed(2),
        totalRewardsDisplay: () => totalCurrentRewards.toFixed(2),
        stakedAmountDisplay: () => stakedAmountNum.toFixed(2),
      },
    };
  }, [
    rewardsData.pendingEthRewards,
    rewardsData.pendingEmarkRewards,
    rewardsData.stakedAmount,
    rewardsData.periodEthRewards,
    rewardsData.periodEmarkRewards,
    periodData.periodEnd,
    periodData.periodStart,
    periodData.currentEthPool,
    periodData.currentEmarkPool,
    periodData.currentEthRate,
    periodData.currentEmarkRate,
    periodData.timeUntilRebalance,
  ]);

  return {
    ...calculations,
    originalRewardsData: rewardsData,
    originalPeriodData: periodData,
    isLoading: rewardsData.isLoadingRewards || periodData.isLoading,
    error: rewardsData.error || periodData.error,
  };
}