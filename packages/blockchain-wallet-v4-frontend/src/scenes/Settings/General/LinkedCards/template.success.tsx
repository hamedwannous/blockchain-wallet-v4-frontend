import { Button, Text } from 'blockchain-info-components'
import {
  CARD_TYPES,
  DEFAULT_CARD_SVG_LOGO
} from 'components/Form/CreditCardBox/model'
import { convertBaseToStandard } from 'data/components/exchange/services'
import { fiatToString } from 'core/exchange/currency'
import { FiatType } from 'core/types'
import { FormattedMessage } from 'react-intl'
import { InjectedFormProps, reduxForm } from 'redux-form'
import { Props as OwnProps, SuccessStateType } from '.'
import { SBFormPaymentMethod } from 'data/types'
import {
  SettingComponent,
  SettingContainer,
  SettingHeader,
  SettingSummary
} from 'components/Setting'
import media from 'services/ResponsiveService'
import React, { SyntheticEvent } from 'react'
import styled from 'styled-components'

const CardWrapper = styled.div`
  display: flex;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  justify-content: space-between;
  border: 1px solid ${props => props.theme.grey000};
  cursor: pointer;
  width: 430px;

  ${media.mobile`
    width: 100%;
  `}
`
const CustomSettingContainer = styled(SettingContainer)`
  @media (min-width: 992px) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
`
const CustomSettingHeader = styled(SettingHeader)`
  margin-bottom: 18px;
`
const CustomSettingComponent = styled(SettingComponent)`
  margin-top: 36px;
  ${media.tablet`
    margin-top: 8px;
  `}
`
const Child = styled.div`
  display: flex;
  div:last-child {
    margin-top: 4px;
  }
`
const CardImg = styled.img`
  margin-right: 14px;
  width: 24px;
`
const CardDetails = styled.div<{ right?: boolean }>`
  text-align: ${props => (props.right ? 'right' : 'initial')};
`

const Success: React.FC<InjectedFormProps<
  {},
  Props & { fiatCurrency?: FiatType }
> &
  Props & { fiatCurrency?: FiatType }> = props => {
  const ccPaymentMethod = props.paymentMethods.methods.find(
    m => m.type === 'PAYMENT_CARD'
  )
  const activeCards = props.cards.filter(card => card.state === 'ACTIVE')

  return !activeCards.length ? null : (
    <CustomSettingContainer>
      <SettingSummary>
        <CustomSettingHeader>
          <FormattedMessage
            id='scenes.settings.linked_cards'
            defaultMessage='Linked Cards'
          />
        </CustomSettingHeader>
        {activeCards.map((card, i) => {
          let cardType = CARD_TYPES.find(
            cardType => cardType.type === (card.card ? card.card.type : '')
          )

          if (card.state !== 'ACTIVE') return

          return (
            <CardWrapper
              key={i}
              onClick={() => {
                if (props.submitting) return
                props.handleCreditCardClick({
                  ...card,
                  type: 'USER_CARD',
                  limits: ccPaymentMethod
                    ? ccPaymentMethod.limits
                    : { min: '500', max: '50000' }
                })
              }}
            >
              <Child>
                <CardImg
                  src={cardType ? cardType.logo : DEFAULT_CARD_SVG_LOGO}
                />
                <CardDetails>
                  <Text size='16px' color='grey800' weight={600}>
                    {card.card.label || card.card.type}
                  </Text>
                  {ccPaymentMethod && (
                    <Text size='14px' color='grey600' weight={500}>
                      {fiatToString({
                        value: convertBaseToStandard(
                          'FIAT',
                          ccPaymentMethod.limits.max
                        ),
                        unit: props.fiatCurrency || 'USD'
                      })}{' '}
                      {props.fiatCurrency} Limit
                    </Text>
                  )}
                </CardDetails>
              </Child>
              <Child>
                <CardDetails right>
                  <Text size='16px' color='grey800' weight={600}>
                    ···· {card.card.number}
                  </Text>
                  <Text size='14px' color='grey600' weight={500}>
                    Exp: {card.card.expireMonth}/{card.card.expireYear}
                  </Text>
                </CardDetails>
                <Button
                  data-e2e='removeCard'
                  nature='light-red'
                  disabled={props.submitting}
                  style={{ marginLeft: '18px', minWidth: 'auto' }}
                  // @ts-ignore
                  onClick={(e: SyntheticEvent) => {
                    e.stopPropagation()
                    props.simpleBuyActions.deleteSBCard(card.id)
                  }}
                >
                  <FormattedMessage
                    id='buttons.remove'
                    defaultMessage='Remove'
                  />
                </Button>
              </Child>
            </CardWrapper>
          )
        })}
      </SettingSummary>
      <CustomSettingComponent>
        <Button
          nature='primary'
          data-e2e='addCardFromSettings'
          onClick={() => props.handleCreditCardClick()}
        >
          <FormattedMessage id='buttons.add_card' defaultMessage='Add Card' />
        </Button>
      </CustomSettingComponent>
    </CustomSettingContainer>
  )
}

type Props = OwnProps &
  SuccessStateType & {
    handleCreditCardClick: (defaultMethod?: SBFormPaymentMethod) => void
  }

export default reduxForm<{}, Props>({ form: 'linkedCards' })(Success)
