import { select } from 'redux-saga/effects'

import { expectSaga, testSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { throwError } from 'redux-saga-test-plan/providers'
import { coreSagasFactory, Remote } from 'blockchain-wallet-v4/src'
import * as actions from '../../actions'
import * as sfoxActions from './actions.js'
import * as selectors from '../../selectors.js'
import sfoxSagas, { logLocation } from './sagas'
import * as C from 'services/AlertService'
import { promptForSecondPassword } from 'services/SagaService'
import * as sendBtcSelectors from '../../components/sendBtc/selectors'

jest.mock('blockchain-wallet-v4/src/redux/sagas')
const coreSagas = coreSagasFactory()

describe('sfoxSagas', () => {
  beforeAll(() => {
    Math.random = () => 0.5
  })

  describe('sfox signup', () => {
    let { sfoxSignup } = sfoxSagas({
      coreSagas
    })
    let saga = testSaga(sfoxSignup)

    it('should set loading', () => {
      saga.next().put(sfoxActions.sfoxLoading())
    })

    it('should call signup', () => {
      saga.next().call(coreSagas.data.sfox.signup)
    })

    it('should select the profile', () => {
      saga.next().select(selectors.core.data.sfox.getProfile)
    })

    describe('successful signup', () => {
      it('should be success', () => {
        const fakeUser = { name: 'Shmee', id: 10 }
        return expectSaga(sfoxSignup)
          .put({ type: '@COMPONENT.SFOX_LOADING' })
          .provide([
            [matchers.call.fn(coreSagas.data.sfox.signup)]
          ])
          .provide([
            [select(selectors.core.data.sfox.getProfile), fakeUser]
          ])
          .put({ type: '@COMPONENT.SFOX_SUCCESS' })
          .put({ type: '@COMPONENT.ENABLE_SIFT_SCIENCE' })
          .put({ type: '@COMPONENT.NEXT_STEP', payload: 'verify' })
          .run()
      })
    })

    describe('signup error', () => {
      it('should throw', () => {
        const profileError = {error: 'signup_error'}
        return expectSaga(sfoxSignup)
          .put({ type: '@COMPONENT.SFOX_LOADING' })
          .provide([
            [matchers.call.fn(coreSagas.data.sfox.signup)]
          ])
          .provide([
            [select(selectors.core.data.sfox.getProfile), profileError]
          ])
          .put({ type: '@COMPONENT.SFOX_NOT_ASKED' })
          .run()
      })
    })
  })

  describe('sfox set bank', () => {
    let { setBank } = sfoxSagas({
      coreSagas
    })

    it('should call core setBankAccount and display success', () => {
      let fakeBank = { id: 5, name: 'Bitcoin Bank' }
      return expectSaga(setBank)
        .provide([
          [matchers.call.fn(coreSagas.data.sfox.setBankAccount), fakeBank]
        ])
        .put(actions.alerts.displaySuccess(C.BANK_ACCOUNT_SET_SUCCESS))
        .put(actions.modals.closeAllModals())
        .run()
    })

    it('logs an error', () => {
      const error = new Error('Error Setting Bank')
      return expectSaga(setBank)
        .provide([
          [matchers.call.fn(coreSagas.data.sfox.setBankAccount), throwError(error)]
        ])
        .put(actions.logs.logErrorMessage(logLocation, 'setBank', error))
        .run()
    })
  })

  describe('sfox handle quote', () => {
    const { submitQuote, prepareAddress } = sfoxSagas({
      coreSagas
    })
    const quoteId = '12345'
    const quoteCurrency = 'USD'
    const quoteAmount = 100

    const action = {
      payload: {
        quoteId,
        quoteCurrency,
        quoteAmount
      }
    }

    const saga = testSaga(submitQuote, action)
    const beforeResponse = 'beforeResponse'

    const nextAddressData = {
      address: '1masdfasdflkjo',
      index: 0,
      accountIndex: 0
    }

    it('should trigger the loading state', () => {
      saga.next().put(sfoxActions.sfoxLoading())
    })

    it('should call prepareAddress', () => {
      saga.next().call(prepareAddress)
    })

    it('should call handleTrade', () => {
      saga.next(nextAddressData).call(coreSagas.data.sfox.handleTrade, action.payload, nextAddressData).save(beforeResponse)
    })

    it('should trigger success if response is not an error', () => {
      const trade = { id: 5 }
      saga.next(trade).put(sfoxActions.sfoxSuccess())
    })

    it('should enable sift science', () => {
      saga.next().put(sfoxActions.enableSiftScience())
    })

    it('should change the tab', () => {
      saga.next().put(actions.form.change('buySellTabStatus', 'status', 'order_history'))
    })

    it('should show the tradeDetails modal', () => {
      let trade = { id: 5 }
      saga
        .next(trade)
        .put(actions.modals.showModal('SfoxTradeDetails', { trade }))
    })

    it('should throw if response is not a trade', () => {
      const response = new Error({message: 'ERROR'})
      saga
        .restore(beforeResponse)
        .next(response)
        // First yield in catch block
        .put(sfoxActions.sfoxFailure(response))
        .next()
        .put(actions.logs.logErrorMessage(logLocation, 'submitQuote', response))
    })
  })

  describe('sfox setProfile', () => {
    const { setProfile } = sfoxSagas({
      coreSagas
    })

    const firstName = 'satoshi'
    const lastName = 'nakamoto'
    const city = 'nyc'

    const data = {
      payload: {
        firstName,
        lastName,
        city
      }
    }

    const saga = testSaga(setProfile, data)
    const beforeDetermine = 'beforeDetermine'

    it('should call core setProfile with a payload', () => {
      saga.next().call(coreSagas.data.sfox.setProfile, data)
    })

    it('should select the profile', () => {
      saga.next().select(selectors.core.data.sfox.getProfile).save(beforeDetermine)
    })

    it('should determine the step to be funding', () => {
      const profile = { data: { verificationStatus: { required_docs: [] } } }
      saga.next(profile).put(sfoxActions.nextStep('funding'))
    })

    it('should determine the step to be upload', () => {
      const profile = { data: { verificationStatus: { required_docs: ['id'] } } }
      saga.restore(beforeDetermine).next(profile).put(sfoxActions.nextStep('upload'))
    })

    describe('error handling', () => {
      const errorProfile = { error: 'invalid_profile' }
      it('should log the error and put the action setVerifyError', () => {
        saga
          .restart()
          .next()
          .throw(errorProfile)
          .put(actions.logs.logErrorMessage(logLocation, 'setProfile', errorProfile))
          .next()
          .put(sfoxActions.setVerifyError(errorProfile))
      })
    })
  })

  describe('sfox submitMicroDeposits', () => {
    const { submitMicroDeposits } = sfoxSagas({
      coreSagas
    })

    const deposit1 = '.02'
    const deposit2 = '.01'

    const data = {
      deposit1,
      deposit2
    }

    const saga = testSaga(submitMicroDeposits, data)
    const beforeDetermine = 'beforeDetermine'
    it('should trigger loading', () => {
      saga.next().put(sfoxActions.sfoxLoading())
    })

    it('should call core saga verifyMicroDeposits with the payload', () => {
      saga.next().call(coreSagas.data.sfox.verifyMicroDeposits, data).save(beforeDetermine)
    })

    it('should follow the success flow', () => {
      const response = { status: 'active' }

      saga
        .next(response)
        .put(sfoxActions.sfoxSuccess())
    })

    it('should handle invalid amounts', () => {
      const response = { status: 'inactive' }
      saga.restore(beforeDetermine).next(response).put(sfoxActions.sfoxNotAsked())
    })

    it('should log and set failure state', () => {
      const response = new Error({ status: 'inactive' })
      saga
        .next(response)
        .put(actions.logs.logErrorMessage(logLocation, 'submitMicroDeposits', response))
        .next()
        .put(sfoxActions.sfoxFailure(response))
    })
  })

  describe('sfox upload', () => {
    const { upload } = sfoxSagas({
      coreSagas
    })

    const data = {}

    const saga = testSaga(upload, data)

    it('should call the core', () => {
      saga.next().call(coreSagas.data.sfox.uploadDoc, data)
    })
    it('should select the profile', () => {
      saga.next().select(selectors.core.data.sfox.getProfile)
    })
    it('should go to funding if no required docs', () => {
      const profile = { data: { verificationStatus: { required_docs: [] } } }

      saga.next(profile).put(sfoxActions.nextStep('funding'))
    })
    it('should handle errors', () => {
      const error = new Error()

      saga
        .restart()
        .next()
        .throw(error)
        .put(actions.logs.logErrorMessage(logLocation, 'upload', error))
        .next()
        .put(actions.alerts.displayError(C.DOCUMENT_UPLOAD_ERROR))
    })
  })

  describe('sfox setBankManually', () => {
    const { setBankManually } = sfoxSagas({
      coreSagas
    })

    const action = {
      payload: {
        id: 1,
        number: 10510
      }
    }

    const saga = testSaga(setBankManually, action)

    it('should trigger loading', () => {
      saga.next().put(sfoxActions.sfoxLoading())
    })
    it('should call the core to set the bank', () => {
      saga.next().call(coreSagas.data.sfox.setBankManually, action.payload)
    })
    it('should select the accounts', () => {
      saga.next().select(selectors.core.data.sfox.getAccounts)
    })
    it('should set success', () => {
      const accounts = [{ id: 1 }]

      saga.next(accounts).put(sfoxActions.sfoxSuccess())
    })
    it('should handle an error', () => {
      const accounts = { error: '{"error": "set_bank_error"}' }

      saga
        .restart()
        .next().put(sfoxActions.sfoxLoading())
        .next().call(coreSagas.data.sfox.setBankManually, action.payload)
        .next().select(selectors.core.data.sfox.getAccounts)
        .next(accounts)
        .put(actions.logs.logErrorMessage(logLocation, 'setBankManually', new Error('set_bank_error')))
        .next()
        .put(sfoxActions.sfoxFailure(new Error('set_bank_error')))
    })
  })

  describe('sfox checkForProfileFailure', () => {
    const { checkForProfileFailure } = sfoxSagas({
      coreSagas
    })

    const saga = testSaga(checkForProfileFailure)

    it('should select the profile', () => {
      saga.next().select(selectors.core.data.sfox.getProfile)
    })

    it('should select modals', () => {
      const profile = Remote.Failure({})
      saga.next(profile).select(selectors.modals.getModals)
    })

    it('should refetch profile', () => {
      const modals = [{ type: 'SfoxExchangeData' }]
      saga.next(modals).call(coreSagas.data.sfox.refetchProfile)
    })
  })

  describe('sfox submitSellQuote', () => {
    const { submitSellQuote } = sfoxSagas({
      coreSagas
    })

    const action = {
      payload: {
        id: 1,
        quoteAmount: 100
      }
    }

    const saga = testSaga(submitSellQuote, action)

    it('should prompt for second password', () => {
      saga.next().call(promptForSecondPassword)
    })

    it('should set loading', () => {
      saga.next().put(sfoxActions.sfoxLoading())
    })

    it('should call the core to sell', () => {
      const trade = { id: 1, quoteAmount: 100 }
      saga.next(trade).call(coreSagas.data.sfox.handleSellTrade, trade)
    })

    it('should select the payment', () => {
      const trade = { id: 1, amount: 100 }
      saga.next(trade).select(sendBtcSelectors.getPayment)
    })
  })
})
