import React, { useEffect, useState, useMemo } from "react";
import intl from 'react-intl-universal';
import {
  DefaultButton,
  IconButton,
  Stack,
  ProgressIndicator,
  SpinButton,
  Pivot,
  PivotItem,
} from "office-ui-fabric-react";
import { Position } from "office-ui-fabric-react/lib/utilities/positioning";
import PreferencePanel from "../../components/preference";
import { DataSource, Field } from "../../global";
import VisSummary from "../../plugins/visSummary/index";
import { useGlobalState } from "../../state";
import Association from "./association/index";
import {
  Subspace,
  FieldSummary
} from "../../service";
import SearchBoard from "./search/index";
import { observer } from 'mobx-react-lite'
import { useGalleryStore } from './store';
import ObserverChart from "./observerChart";
import VizPreference from "./vizPreference";

const pivotKeyList = [
  'rankList',
  'search'
];

interface GalleryProps {
  subspaceList: Subspace[];
  /**
   * dataSource here should be cookedData.
   */
  dataSource: DataSource;
  summary: {
    origin: FieldSummary[];
    grouped: FieldSummary[];
  };
}

const Gallery: React.FC<GalleryProps> = props => {
  const { dataSource, summary, subspaceList } = props;
  const [state, ] = useGlobalState();
  const store = useGalleryStore();
  const {
    currentPage,
    showAssociation,
    visualConfig,
    currentSpace,
    fields,
    vizRecommand
  } = store;
  const pivotList = useMemo(() => {
    return pivotKeyList.map((page, index) => {
      return { title: intl.get(`explore.${page}`), itemKey: 'pivot-' + index }
    })
  }, [state.lang])

  const [pivotIndex, setPivotIndex] = useState(pivotList[0].itemKey);

  useEffect(() => {
      const fields = [...summary.origin, ...summary.grouped];
      store.init(dataSource, fields, subspaceList);
  }, [dataSource, subspaceList, summary.origin, summary.grouped, store]);

  useEffect(() => {
    store.clusterMeasures(state.maxGroupNumber, state.useServer)
  }, [subspaceList, dataSource, state.maxGroupNumber, state.useServer, store]);

  useEffect(() => {
    // 换页的时候强制关闭联想.
    store.showAssociation = false;
  }, [currentPage]);

  return (
    <div className="content-container">
      <VizPreference />

      <div className="card" style={{ paddingTop: '0.2rem' }}>
        <Pivot
          selectedKey={pivotIndex}
          onLinkClick={(item) => {
            item && setPivotIndex(item.props.itemKey!)
          }}
        >
          {pivotList.map((pivot) => (
            <PivotItem headerText={pivot.title} key={pivot.itemKey} itemKey={pivot.itemKey} />
          ))}
        </Pivot>
        {(store.loading || state.loading.subspaceSearching || state.loading.univariateSummary) && (
          <ProgressIndicator description="calculating" />
        )}
        {pivotIndex === pivotList[0].itemKey && (
          <div>
            <h2 style={{ marginBottom: 0 }}>
              {intl.get('explore.title')}
              <IconButton
                iconProps={{ iconName: 'Settings' }}
                title={intl.get('explore.preference')}
                ariaLabel={intl.get('explore.preference')}
                onClick={() => {
                  store.showConfigPanel = true;
                }}
              />
              <IconButton
                iconProps={{ iconName: 'Lightbulb' }}
                title={intl.get('explore.digIn')}
                ariaLabel={intl.get('explore.digIn')}
                onClick={() => {
                  store.showAssociation = true;
                }}
              />
            </h2>
            <p className="state-description">{intl.get('explore.desc')}</p>
            <p className="state-description">{intl.get('explore.tip')}</p>
            <div className="ms-Grid" dir="ltr">
              <div className="ms-Grid-row">
                <div className="ms-Grid-col ms-sm6 ms-md8 ms-lg3" style={{ overflow: 'auto' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <SpinButton
                      label={intl.get('explore.currentPage')}
                      value={(currentPage + 1).toString()}
                      min={0}
                      max={store.viewSpaces.length}
                      step={1}
                      iconProps={{ iconName: 'Search' }}
                      labelPosition={Position.end}
                      // tslint:disable:jsx-no-lambda
                      onValidate={(value: string) => {
                        store.goToPage((Number(value) - 1) % store.viewSpaces.length)
                      }}
                      onIncrement={() => {
                        store.nextPage();
                      }}
                      onDecrement={() => {
                        store.lastPage();
                      }}
                      incrementButtonAriaLabel={'Increase value by 1'}
                      decrementButtonAriaLabel={'Decrease value by 1'}
                    />
                  </div>
                  <p className="state-description">
                    Page No. {currentPage + 1} of {store.viewSpaces.length}
                  </p>
                  <Stack horizontal tokens={{ childrenGap: 20 }}>
                    <DefaultButton
                      text={intl.get('explore.last')}
                      onClick={() => {
                        store.lastPage();
                      }}
                      allowDisabledFocus
                    />
                    <DefaultButton
                      text={intl.get('explore.next')}
                      onClick={() => {
                        store.nextPage();
                      }}
                      allowDisabledFocus
                    />
                  </Stack>
                  <div style={{ margin: '10px 0px'}}>
                    <DefaultButton
                      iconProps={{
                        iconName: store.likes.has(currentPage) ? 'HeartFill' : 'Heart',
                        style: { color: '#f5222d' },
                      }}
                      text={intl.get('explore.like')}
                      onClick={() => {
                        store.likeIt(currentPage, vizRecommand.schema )
                      }}
                    />
                  </div>
                  <h3>Specification</h3>
                  <pre>{JSON.stringify(vizRecommand.schema, null, 2)}</pre>
                  <VisSummary
                    dimensions={vizRecommand.dimensions}
                    measures={vizRecommand.measures}
                    dimScores={fields}
                    space={currentSpace}
                    spaceList={subspaceList}
                    schema={vizRecommand.schema}
                  />
                </div>
                <div className="ms-Grid-col ms-sm6 ms-md4 ms-lg9" style={{ overflow: 'auto' }}>
                  <ObserverChart />
                </div>
              </div>
            </div>
          </div>
        )}
        {pivotIndex === pivotList[1].itemKey && <SearchBoard />}
      </div>

      {pivotIndex === pivotList[0].itemKey && showAssociation && (
        <div className="card">
          <h2> {intl.get('explore.related.title')} </h2>
          <Association
            onSelectView={(index) => {
              let pos = store.viewSpaces.findIndex((v) => v.index === index)
              if (pos > -1) {
                store.goToPage(pos)
              }
            }}
            subspaceList={subspaceList}
            digDimensionProps={{
              visualConfig,
              dataSource,
              viewSpaces: store.viewSpaces,
              fieldScores: fields,
              interestedViewSpace: store.currentViewSpace,
            }}
          />
        </div>
      )}
    </div>
  )
};

export default observer(Gallery);
